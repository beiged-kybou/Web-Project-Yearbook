import express from "express";
import {
  getAllStudents,
  getStudentById,
  getStudentByName,
  getStudentsByYear,
} from "../controllers/studentController.js";

const router = express.Router();

router.get("/", getAllStudents);
router.get("/search", getStudentByName);
router.get("/:year", getStudentsByYear);
router.get("/:id", getStudentById);

export default router;
