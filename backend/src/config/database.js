import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

let pool = null;

export const getPool = async () => {
  if (pool) {
    console.log("Reusing existing pool");
    return pool;
  }

  try {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await pool.query("SELECT NOW()");
    console.log("PostgreSQL pool created successfully");

    pool.on("error", (err) => {
      console.error("Unexpected pool error:", err);
    });

    return pool;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
};
