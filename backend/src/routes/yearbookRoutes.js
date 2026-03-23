import express from "express";
import {
  listReleases,
  listPublishedReleases,
  createRelease,
  updateReleaseStatus,
  listReleasePages,
  assignPageOwner,
  listMyPages,
  updatePageContent,
  submitPage,
  approvePage,
  uploadPageImage,
  addPostToPage,
  removePostFromPage,
  getPublishedRelease,
  getPageDetail,
  deletePageImage,
} from "../controllers/yearbookController.js";
import { authenticate, authorizeRootAdmin } from "../middleware/auth.js";
import { eventUpload } from "../middleware/upload.js";

const router = express.Router();

router.get("/", authenticate, authorizeRootAdmin, listReleases);
router.post("/", authenticate, authorizeRootAdmin, eventUpload.single("cover"), createRelease);
router.patch("/:releaseId/status", authenticate, authorizeRootAdmin, updateReleaseStatus);
router.get("/:releaseId/pages", authenticate, authorizeRootAdmin, listReleasePages);
router.put("/pages/:pageId/assign", authenticate, authorizeRootAdmin, assignPageOwner);
router.post("/pages/:pageId/approve", authenticate, authorizeRootAdmin, approvePage);

router.get("/me/pages", authenticate, listMyPages);
router.put("/pages/:pageId", authenticate, updatePageContent);
router.post("/pages/:pageId/submit", authenticate, submitPage);
router.post("/pages/:pageId/images", authenticate, eventUpload.single("image"), uploadPageImage);
router.delete("/pages/:pageId/images/:imageId", authenticate, deletePageImage);
router.post("/pages/:pageId/posts", authenticate, addPostToPage);
router.delete("/pages/:pageId/posts/:attachmentId", authenticate, removePostFromPage);
router.get("/pages/:pageId", authenticate, getPageDetail);

router.get("/public", listPublishedReleases);
router.get("/public/:releaseId", getPublishedRelease);

export default router;
