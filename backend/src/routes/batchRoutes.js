import express from "express";
import { authenticate } from "../middleware/auth.js";
import { getBatchDetails, listBatches } from "../controllers/batchController.js";

const router = express.Router();

router.get("/", authenticate, listBatches);
router.get("/:year", authenticate, getBatchDetails);

export default router;
