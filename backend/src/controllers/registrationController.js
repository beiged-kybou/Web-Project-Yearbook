import jwt from "jsonwebtoken";
import otpService from "../services/otpService";
import { sendOtpMail } from "../utils/mailer";
import User from "../models/User";
import OtpVerification from "../models/OtpVerification";

export const requestOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const userCheck = await User.findOne({ email });
    if (userCheck) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const otp = otpService.generateOtp();
    const { otp_code, otp_expires_at } = otpService.buildOtpUpdatePayload(otp);

    await OtpVerification.findOneAndUpdate(
      { email },
      { 
        otpHash: otp_code, 
        expiresAt: otp_expires_at,
        attempts: 0
      },
      { upsert: true, new: true, returnDocument: 'after' }
    );

    await sendOtpMail(email, otp);

    res.status(200).json({ message: "Verification code sent to mail" });
  } catch (error) {
    console.log("Error in requesting OTP", error);
    return res.status(500).json({ error: "Error requesting OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const verification = await OtpVerification.findOne({ email });

    if (!verification) {
      return res.status(404).json({ error: "No pending verification found." });
    }

    const { otpHash, expiresAt, attempts } = verification;

    if (attempts >= 5) {
      return res
        .status(429)
        .json({ error: "Too many attempts. Please request a new OTP." });
    }

    if (otpService.isOtpExpired(expiresAt)) {
      return res.status(410).json({ error: "OTP expired." });
    }

    const isValid = otpService.verifyOtp(otp, otpHash);

    if (!isValid) {
      await OtpVerification.updateOne(
        { email },
        { $inc: { attempts: 1 } }
      );
      return res.status(401).json({ error: "Invalid code." });
    }

    const registrationToken = jwt.sign(
      { email, purpose: "registration" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.status(200).json({
      message: "Email verified.",
      registrationToken,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
