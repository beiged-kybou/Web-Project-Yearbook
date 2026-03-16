import express from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";
import { decideMemory, decideTag, getAdminDashboard } from "../controllers/adminController.js";

const router = express.Router();

router.get("/dashboard", authenticate, authorizeAdmin, getAdminDashboard);
router.post("/memories/:memoryId/decision", authenticate, authorizeAdmin, decideMemory);
router.post("/tags/:tagId/decision", authenticate, authorizeAdmin, decideTag);

export default router;
