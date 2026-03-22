import express from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";
import { getAccessList, revokeAccess, updateRole } from "../controllers/roleController.js";

const router = express.Router();

router.get("/access", authenticate, authorizeAdmin, getAccessList);
router.post("/access/:userId/role", authenticate, authorizeAdmin, updateRole);
router.delete("/access/:userId", authenticate, authorizeAdmin, revokeAccess);

export default router;
