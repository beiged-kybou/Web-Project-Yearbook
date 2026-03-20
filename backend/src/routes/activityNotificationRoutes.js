import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  listActivityNotifications,
  markActivityNotificationRead,
  markAllActivityNotificationsRead,
} from "../controllers/activityNotificationController.js";

const router = express.Router();

router.get("/me", authenticate, listActivityNotifications);
router.post("/me/mark-all", authenticate, markAllActivityNotificationsRead);
router.post("/:notificationId/read", authenticate, markActivityNotificationRead);

export default router;
