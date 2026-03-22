import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { getPool } from "./config/database.js";
import { ensureClubSetup } from "./config/clubSetup.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import memoryRoutes from "./routes/memoryRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import clubRoutes from "./routes/clubRoutes.js";
import tagNotificationRoutes from "./routes/tagNotificationRoutes.js";
import activityNotificationRoutes from "./routes/activityNotificationRoutes.js";
import batchRoutes from "./routes/batchRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.locals.getPool = getPool;

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/memories", memoryRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/tag-notifications", tagNotificationRoutes);
app.use("/api/activity-notifications", activityNotificationRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/roles", roleRoutes);

app.use("/uploads", express.static("uploads"));

const startServer = async () => {
  try {
    const pool = await getPool();
    await ensureClubSetup(pool);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
