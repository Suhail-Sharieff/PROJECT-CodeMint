import { app } from "./app.js";
import { connect_To_DB, initDB } from "./Utils/sql_connection.js";
import { init_query } from "./__init__.js";
import { createServer } from "http";
import { socketManager } from "./socket_events.js";
import dotenv from "dotenv";

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

    socketManager.initialize(server);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ SERVER RUNNING: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ SERVER ERROR:", err.message);
    process.exit(1);
  }
};

startServer();