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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
