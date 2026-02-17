import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES ?? "10", 10);

export function generateOtp(length = OTP_LENGTH) {
  const digits = [];
  for (let i = 0; i < length; i += 1) {
    digits.push(crypto.randomInt(0, 10));
  }
  return digits.join("");
}

export function hashOtp(otp) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHmac("sha256", salt)
    .update(otp)
    .digest("hex");
  return `${salt}:${hash}`;
}

export function extractOtpParts(storedValue) {
  if (!storedValue || typeof storedValue !== "string") return null;
  const [salt, hash] = storedValue.split(":");
  if (!salt || !hash) return null;
  return { salt, hash };
}

export function verifyOtp(otp, storedValue) {
  const parts = extractOtpParts(storedValue);
  if (!parts) return false;
  const computed = crypto
    .createHmac("sha256", parts.salt)
    .update(otp)
    .digest("hex");

  const storedBuffer = Buffer.from(parts.hash, "hex");
  const computedBuffer = Buffer.from(computed, "hex");
  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(storedBuffer, computedBuffer);
}

export function getOtpExpiry(baseDate = new Date()) {
  const expires = new Date(baseDate);
  expires.setMinutes(expires.getMinutes() + OTP_TTL_MINUTES);
  return expires;
}

export function buildOtpUpdatePayload(otp) {
  return {
    otp_code: hashOtp(otp),
    otp_expires_at: getOtpExpiry(),
    otp_verified: false,
  };
}

export function isOtpExpired(expiresAt, now = new Date()) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= now.getTime();
}

export default {
  generateOtp,
  hashOtp,
  extractOtpParts,
  verifyOtp,
  getOtpExpiry,
  buildOtpUpdatePayload,
  isOtpExpired,
};
