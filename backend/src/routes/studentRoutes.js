import express from "express";
import {
    createStudent,
    deleteStudent,
    getAllStudents,
    getMyProfile,
    getStudentById,
    getStudentByName,
    getStudentsByYear,
    updateMyProfile,
    updateStudent,
} from "../controllers/studentController.js";
import { authenticate } from "../middleware/auth.js";
import { memoryUpload } from "../middleware/upload.js";

const router = express.Router();

router.get("/me/profile", authenticate, getMyProfile);
router.put("/me/profile", authenticate, memoryUpload.single("displayPhotoFile"), updateMyProfile);
router.get("/", getAllStudents);
router.post("/", createStudent);
router.get("/search", getStudentByName);
router.get("/year/:year", getStudentsByYear);
router.get("/:id", getStudentById);
router.delete("/:id", deleteStudent);
router.put("/:id", updateStudent);

export default router;
