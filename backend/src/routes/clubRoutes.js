import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  joinClub,
  leaveClub,
  listClubs,
  myClubs,
} from "../controllers/clubController.js";

const router = express.Router();

router.get("/", listClubs);
router.get("/me", authenticate, myClubs);
router.post("/:clubCode/join", authenticate, joinClub);
router.delete("/:clubCode/leave", authenticate, leaveClub);

export default router;
