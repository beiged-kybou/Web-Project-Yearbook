import express from "express";
import { createMemory, createPublicMemory, listDrafts, updateDraft } from "../controllers/memoryController.js";
import { authenticate } from "../middleware/auth.js";
import { memoryUpload } from "../middleware/upload.js";

const router = express.Router();

router.post("/", authenticate, memoryUpload.array("images", 10), createMemory);
router.post("/public", authenticate, memoryUpload.array("images", 10), createPublicMemory);
router.get("/drafts", authenticate, listDrafts);
router.put("/drafts/:draftId", authenticate, memoryUpload.array("images", 10), updateDraft);

export default router;
