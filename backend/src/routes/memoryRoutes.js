import express from "express";
import {
  getAllMemories,
  getMemoriesByStudent,
  getMemoryById,
} from "../controllers/memoryController.js";

const router = express.Router();

router.get("/", getAllMemories);
router.get("/student/:studentId", getMemoriesByStudent);
router.get("/:id", getMemoryById);

export default router;
