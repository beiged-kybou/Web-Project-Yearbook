import express from "express";
import { completeRegistration, requestOtp, verifyOtp } from "../controllers/authController.js";

const router = express.Router();

router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtp);
router.post("/register/complete", completeRegistration);

export default router;
