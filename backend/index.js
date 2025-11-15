import { app } from "./app.js";
import { connect_To_DB, initDB } from "./Utils/sql_connection.js";
import { init_query } from "./__init__.js";
import { createServer } from "http";
import { socketManager } from "./socket_events.js";


const PORT = process.env.PORT;

const startServer = async () => {
  try {
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