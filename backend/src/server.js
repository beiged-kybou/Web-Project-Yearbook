import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { getPool } from "./config/database.js";
// import studentRoutes from "./routes/students.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.locals.getPool = getPool;

app.get("/api/test", async (req, res) => {
  try {
    const pool = await req.app.locals.getPool();
    const result = await pool.query("SELECT COUNT(*) FROM students");
    res.json({ students: result.rows[0].count, status: "DB Connected!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// app.use("/api/students", studentRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
