import { Pool } from "pg";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const connectDB = async () => {
  try {
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully!");

    pool.on("error", (err) => {
      console.log("Unexpected PostgreSQL error:", err);
      process.exit(1);
    });
  } catch (error) {
    console.log("Error connecting to PostgreSQL:", error);
    process.exit(1);
  }
};
