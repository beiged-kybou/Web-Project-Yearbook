import express from "express";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  createEventPost,
  listEventPosts,
  subscribeEvent,
  unsubscribeEvent,
  bookmarkEntity,
  removeBookmark,
  listBookmarks,
  followUser,
  unfollowUser,
  listFollowing,
  listFollowers,
} from "../controllers/eventController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";
import { eventUpload } from "../middleware/upload.js";

const router = express.Router();

router.get("/", authenticate, listEvents);
router.post("/", authenticate, authorizeAdmin, eventUpload.single("coverPhoto"), createEvent);
router.put(
  "/:eventId",
  authenticate,
  authorizeAdmin,
  eventUpload.single("coverPhoto"),
  updateEvent,
);
router.delete("/:eventId", authenticate, authorizeAdmin, deleteEvent);

router.get("/:eventId/posts", authenticate, listEventPosts);
router.post(
  "/:eventId/posts",
  authenticate,
  authorizeAdmin,
  eventUpload.array("postImages", 5),
  createEventPost,
);

router.post("/:eventId/subscribe", authenticate, subscribeEvent);
router.delete("/:eventId/subscribe", authenticate, unsubscribeEvent);

router.post("/bookmarks", authenticate, bookmarkEntity);
router.delete("/bookmarks", authenticate, removeBookmark);
router.get("/bookmarks/me", authenticate, listBookmarks);

router.post("/follow/:targetUserId", authenticate, followUser);
router.delete("/follow/:targetUserId", authenticate, unfollowUser);
router.get("/follow/:userId/following", authenticate, listFollowing);
router.get("/follow/:userId/followers", authenticate, listFollowers);

export default router;
