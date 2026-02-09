import express from "express";
import {
  getAllStudents,
  getStudentById,
  getStudentByName,
  getStudentsByYear,
} from "../controllers/studentController";

const router = express.Router();

router.get("/", getAllStudents);
router.get("/:year", getStudentsByYear);
router.get("/search?q=", getStudentByName);
router.get("/:id", getStudentById);

export default router;
