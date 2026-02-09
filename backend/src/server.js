import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";

import connectDB from "../config/db.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

let pool;

app.get("/api/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM students");
    res.json({ students: result.rows[0].count, status: "DB Connected!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

connectDB().then((dbPool) => {
  pool = dbPool;
  app.listen(PORT, () => {
    console.log("Server started on PORT:", PORT);
  });
});
