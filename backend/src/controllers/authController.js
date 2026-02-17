import jwt from "jsonwebtoken";
import otpService from "../services/otpService";
import { sendOtpMail } from "../utils/mailer";

export const requestOtp = async (req, res) => {
  const { email } = req.body;
  const pool = await req.app.locals.getPool();

  try {
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const otp = otpService.generateOtp();
    const { otp_code, otp_expires_at } = otpService.buildOtpUpdatePayload(otp);

    const upsertOtpQuery = `
      INSERT INTO otp_verifications (email, otp_hash, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (email)
      DO UPDATE SET
        otp_hash = EXCLUDED.otp_hash,
        expires_at = EXCLUDED.expires_at,
        attempts = 0,
        created_at = NOW();
    `;

    await pool.query(upsertOtpQuery, [email, otp_code, otp_expires_at]);
    await sendOtpMail(email, otp);

    res.status(200).json({ message: "Verification code sent to mail" });
  } catch (error) {
    console.log("Error in requesting OTP", error);
    return req.status(500).json({ error: "Error requesting OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const result = await pool.query(
      "SELECT otp_hash, expires_at, attempts FROM otp_verifications WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No pending verification found." });
    }

    const { otp_hash, expires_at, attempts } = result.rows[0];

    if (attempts >= 5) {
      return res
        .status(429)
        .json({ error: "Too many attempts. Please request a new OTP." });
    }

    if (otpService.isOtpExpired(expires_at)) {
      return res.status(410).json({ error: "OTP expired." });
    }

    const isValid = otpService.verifyOtp(otp, otp_hash);

    if (!isValid) {
      await pool.query(
        "UPDATE otp_verifications SET attempts = attempts + 1 WHERE email = $1",
        [email],
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
