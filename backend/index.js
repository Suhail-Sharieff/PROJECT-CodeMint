import { app } from "./app.js";
import { connect_To_DB, initDB } from "./Utils/sql_connection.js";
import { init_query } from "./__init__.js";
import { createServer } from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";

dotenv.config();

// Validate required environment variables
const validateEnv = () => {
  const required = [
    'PORT',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_PORT',
    'DB_NAME',
    'ACCESS_TOKEN_SECRET',
    'ACCESS_TOKEN_EXPIRY',
    'REFRESH_TOKEN_SECRET',
    'REFRESH_TOKEN_EXPIRY',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Please create a .env file in the backend directory with these variables.');
    console.error('   Example values:');
    console.error('   PORT=3000');
    console.error('   DB_HOST=localhost');
    console.error('   DB_USER=root');
    console.error('   DB_PASSWORD=your_password');
    console.error('   DB_PORT=3306');
    console.error('   DB_NAME=codemint');
    console.error('   ACCESS_TOKEN_SECRET=your_long_random_secret_here');
    console.error('   ACCESS_TOKEN_EXPIRY=15m');
    console.error('   REFRESH_TOKEN_SECRET=your_long_random_secret_here');
    console.error('   REFRESH_TOKEN_EXPIRY=7d');
    process.exit(1);
  }
};

const PORT = process.env.PORT;

const startServer = async () => {
  try {
    validateEnv();
    await connect_To_DB();
    await initDB(init_query);

    const server = createServer(app);
    const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const io = new Server(server, {
      cors: {
        origin: (origin, cb) => {
             // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return cb(null, true);
            if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
            cb(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      // OPTIONAL BUT RECOMMENDED: Force websockets to reduce stickiness issues
      transports: ['websocket', 'polling'] 
    });
    const { registerSocketEvents } = await import("./socket_events.js");
    registerSocketEvents(io);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ SERVER RUNNING: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ SERVER ERROR:", err.message);
    process.exit(1);
  }
};

startServer();


/*
//---------------------------SCALING via clustering
import { app } from "./app.js";
import { connect_To_DB, initDB } from "./Utils/sql_connection.js";
import { init_query } from "./__init__.js";
import { createServer } from "http";
import dotenv from "dotenv";
import cluster from "cluster";
import { availableParallelism } from "os";

// Sticky & Cluster imports
import { setupMaster, setupWorker } from "@socket.io/sticky";
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";
import { Server } from "socket.io";

dotenv.config();

const numCPUs = availableParallelism();

if (cluster.isPrimary) {
  console.log(`🧩 Master started with ${numCPUs} workers on PID ${process.pid}`);

  const httpServer = createServer();
  
  // 1. Setup Sticky Master
  // Removing 'least-connection' to ensure IP-based stickiness works for Polling
  setupMaster(httpServer, {
    loadBalancingMethod: "round-robin", 
  });

  // 2. Setup Cluster Communication (Needed for broadcasting between workers)
  setupPrimary(); 

  httpServer.listen(process.env.PORT, () => {
    console.log("Master balancer listening on " + process.env.PORT);
  });

  for (let i = 0; i < numCPUs; i++) cluster.fork();

  cluster.on("exit", (worker) => {
    console.log(`❌ Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  console.log(`🔧 Worker ${process.pid} started`);

  const start = async () => {
    // Each worker needs its own DB connection pool
    // Ensure MySQL max_connections >= numCPUs * pool_size
    await connect_To_DB();
    
    // Only init DB if you are sure it won't race condition (better to do in Master)
    // await initDB(init_query); 

    const httpServer = createServer(app);

    const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    
    const io = new Server(httpServer, {
      cors: {
        origin: (origin, cb) => {
             // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return cb(null, true);
            if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
            cb(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      // OPTIONAL BUT RECOMMENDED: Force websockets to reduce stickiness issues
      // transports: ['websocket', 'polling'] 
    });

    // 3. Use Cluster Adapter
    io.adapter(createAdapter());

    // 4. Setup Worker for Stickiness
    setupWorker(io);

    // Import events
    const { registerSocketEvents } = await import("./socket_events.js");
    registerSocketEvents(io);

    // Worker listens on 0 (random port) - Master proxies to this
    httpServer.listen(0); 
  };

  start();
}
  */