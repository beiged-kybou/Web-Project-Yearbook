import express from "express";
import {
  createStudent,
  deleteStudent,
  getAllStudents,
  getStudentById,
  getStudentByName,
  getStudentsByYear,
  updateStudent,
} from "../controllers/studentController.js";

const router = express.Router();

router.get("/", getAllStudents);
router.post("/", createStudent);
router.get("/search", getStudentByName);
router.get("/year/:year", getStudentsByYear);
router.get("/:id", getStudentById);
router.delete("/:id", deleteStudent);
router.put("/:id", updateStudent);

export default router;
