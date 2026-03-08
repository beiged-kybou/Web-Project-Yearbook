import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  actOnTagNotification,
  getMyTagNotifications,
} from "../controllers/tagNotificationController.js";

const router = express.Router();

router.get("/me", authenticate, getMyTagNotifications);
router.post("/:notificationId/decision", authenticate, actOnTagNotification);

export default router;
