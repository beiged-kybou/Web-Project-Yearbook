import express from "express";
import {
  createMemory,
  createPublicMemory,
  listDrafts,
  updateDraft,
  listFeed,
  upsertReaction,
  deleteReaction,
  listComments,
  addComment,
  updateComment,
  deleteComment,
} from "../controllers/memoryController.js";
import { authenticate } from "../middleware/auth.js";
import { memoryUpload } from "../middleware/upload.js";

const router = express.Router();

router.post("/", authenticate, memoryUpload.array("images", 10), createMemory);
router.post("/public", authenticate, memoryUpload.array("images", 10), createPublicMemory);
router.get("/drafts", authenticate, listDrafts);
router.put("/drafts/:draftId", authenticate, memoryUpload.array("images", 10), updateDraft);
router.get("/feed", authenticate, listFeed);
router.post("/:memoryId/reactions", authenticate, upsertReaction);
router.delete("/:memoryId/reactions", authenticate, deleteReaction);
router.get("/:memoryId/comments", authenticate, listComments);
router.post("/:memoryId/comments", authenticate, addComment);
router.put("/:memoryId/comments/:commentId", authenticate, updateComment);
router.delete("/:memoryId/comments/:commentId", authenticate, deleteComment);

export default router;
