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
