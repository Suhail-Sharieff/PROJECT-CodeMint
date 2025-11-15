import dotenv from "dotenv";
import { createPool, createConnection } from "mysql2";
dotenv.config();

// Create a pool without database first (will be recreated after DB is created)
let db = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionLimit: 20,
  waitForConnections:true,
  queueLimit:1,
  connectTimeout: 10000,
  multipleStatements: true, // because we execute multiple statements in init_queries
  port: process.env.DB_PORT,
  database:process.env.DB_NAME
}).promise();

/*
 Retry wrapper for DB connection, because it doent cause problem while testing locally coz for local testing we initilized in workbench and then launched the node server, but when we ty testing using docker without retry logic, then, both mysql and node server container will try running parallely, the node may try to connect to sql before the sql engine is initilized, so its important to add a retry logic so that it retries again to connect unitll docker sql engine is initilized
 */
const connect_To_DB = async () => {
  let retries = 10;
  while (retries) {
    try {
      // First, try to connect without specifying database to check if MySQL is available
      const tempConnection = await createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      }).promise();
      
      // Check if database exists, if not, we'll create it in initDB
      let dbExists = true;
      try {
        await tempConnection.query(`USE ${process.env.DB_NAME}`);
        console.log(`✅ Database '${process.env.DB_NAME}' exists`);
      } catch (dbErr) {
        if (dbErr.code === 'ER_BAD_DB_ERROR') {
          console.log(`ℹ️  Database '${process.env.DB_NAME}' does not exist yet. It will be created during initialization.`);
          dbExists = false;
        } else {
          throw dbErr;
        }
      }
      
      await tempConnection.end();
      
      // Only try to connect with the pool if database exists
      // Otherwise, let initDB create it first
      if (dbExists) {
        const connection = await db.getConnection();
        console.log("✅ MySQL DB connected");
        connection.release();
      }
      return;
    } catch (err) {
      // If database doesn't exist, that's okay - we'll create it
      if (err.code === 'ER_BAD_DB_ERROR') {
        console.log(`ℹ️  Database '${process.env.DB_NAME}' does not exist. It will be created during initialization.`);
        return; // Exit retry loop, database will be created in initDB
      }
      
      console.error(
        `❌ DB connection error (${err.code}): ${
          err.sqlMessage || err.message
        }. Retrying in 5s...`
      );
      retries -= 1;
      if (!retries) throw new Error("❌ Could not connect to DB after retries");
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};


const initDB = async (init_query) => {
  // First, connect without database to create it if needed
  const tempConnection = await createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    multipleStatements: true,
  }).promise();
  
  try {
    await tempConnection.beginTransaction();
    
    // Create database if it doesn't exist
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME} DEFAULT CHARACTER SET utf8mb4`);
    await tempConnection.query(`USE ${process.env.DB_NAME}`);
    
    // Now run the rest of the init query
    await tempConnection.query(init_query);
    
    await tempConnection.commit();
    console.log("✅ Database schema initialized successfully");
    
    // Recreate the pool with the database now that it exists
    db = createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionLimit: 20,
      waitForConnections: true,
      queueLimit: 1,
      connectTimeout: 10000,
      multipleStatements: true,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    }).promise();
    
  } catch (err) {
    console.error(
      "❌ Schema init failed, rolling back:",
      err.code,
      err.sqlMessage || err.message
    );
    await tempConnection.rollback();
    throw err;
  } finally {
    await tempConnection.end();
  }
};

export { connect_To_DB, initDB, db };