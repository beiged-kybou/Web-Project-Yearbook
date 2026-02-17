import otpService from "../services/otpService";
import { sendOtpMail } from "../utils/mailer";

export const requestOtp = async (req, res) => {
  const { email } = req.body;

  const emailRegex = /^[A-Za-z0-9._%+-]+@iut-dhaka\.edu$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Please enter a valid IUT mail." });
  }

  try {
    const otp = otpService.generateOtp();
    const {otp_code, otp_expires_at} = otpService.buildOtpUpdatePayload(otp);

    const query = `
    INSERT INTO users (email, otp_code, otp_exires_at, otp_verified)
    VALUES ($1, $2, $3, FALSE)
    ON CONFLICT (email)
    DO UPDATE SET
      otp_code = EXCLUDED.otp_code,
      otp_expires_at
    `
  }
};
