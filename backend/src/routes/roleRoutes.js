import express from "express";
import { authenticate, authorizeRootAdmin } from "../middleware/auth.js";
import { getAccessList, revokeAccess, updateRole } from "../controllers/roleController.js";

const router = express.Router();

router.get("/access", authenticate, authorizeRootAdmin, getAccessList);
router.post("/access/:userId/role", authenticate, authorizeRootAdmin, updateRole);
router.delete("/access/:userId", authenticate, authorizeRootAdmin, revokeAccess);

export default router;
