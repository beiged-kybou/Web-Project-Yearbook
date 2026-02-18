import express from "express";
import { createMemory, createPublicMemory } from "../controllers/memoryController.js";
import { authenticate } from "../middleware/auth.js";
import { memoryUpload } from "../middleware/upload.js";

const router = express.Router();

router.post("/", authenticate, memoryUpload.array("images", 10), createMemory);
router.post("/public", authenticate, memoryUpload.array("images", 10), createPublicMemory);

export default router;
