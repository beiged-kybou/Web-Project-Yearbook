import express from "express";
import { createAlbum, getAlbums, getAlbumById } from "../controllers/albumController.js";
import { createMemory } from "../controllers/memoryController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// Albums
router.post("/", verifyToken, createAlbum);
router.get("/", getAlbums);
router.get("/:id", getAlbumById);

// Memories (Nested route logic or separate)
// For now, adding memory to album
router.post("/:id/memories", verifyToken, upload.array("photos", 10), createMemory);

export default router;
