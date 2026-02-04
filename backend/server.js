import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";

import connectDB from "./config/db.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server started on PORT:", PORT);
  });
});
