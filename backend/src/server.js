import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { getPool } from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import memoryRoutes from "./routes/memoryRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.locals.getPool = getPool;

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/memories", memoryRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
