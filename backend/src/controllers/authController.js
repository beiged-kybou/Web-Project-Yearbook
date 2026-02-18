import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import otpService from "../services/otpService.js";
import { sendOtpMail } from "../utils/mailer.js";

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
    return res.status(500).json({ error: "Error requesting OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const pool = await req.app.locals.getPool();

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

export const completeRegistration = async (req, res) => {
  const { registrationToken, password, displayName, studentId } = req.body;
  const pool = await req.app.locals.getPool();

  try {
    // Verify registration token
    let decoded;
    try {
      decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
      if (decoded.purpose !== "registration") {
        return res.status(400).json({ error: "Invalid token purpose." });
      }
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const { email } = decoded;

    // Validate password strength
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "User already registered." });
    }

    // If studentId provided, verify it exists in students table
    if (studentId) {
      const studentCheck = await pool.query(
        "SELECT student_id FROM students WHERE student_id = $1",
        [studentId]
      );

      if (studentCheck.rows.length === 0) {
        return res.status(404).json({ error: "Student ID not found." });
      }

      // Check if student_id is already linked to another user
      const studentLinkCheck = await pool.query(
        "SELECT id FROM users WHERE student_id = $1",
        [studentId]
      );

      if (studentLinkCheck.rows.length > 0) {
        return res.status(409).json({ error: "Student ID already linked to another account." });
      }
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const insertQuery = `
      INSERT INTO users (email, password_hash, display_name, student_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, display_name, role, created_at
    `;

    const result = await pool.query(insertQuery, [
      email,
      passwordHash,
      displayName || null,
      studentId || null,
    ]);

    const newUser = result.rows[0];

    // Delete OTP verification record
    await pool.query("DELETE FROM otp_verifications WHERE email = $1", [email]);

    // Generate access token
    const accessToken = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Registration completed successfully.",
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        role: newUser.role,
        createdAt: newUser.created_at,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Complete Registration Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const pool = await req.app.locals.getPool();

  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Find user by email
    const result = await pool.query(
      `SELECT id, email, password_hash, display_name, role, avatar_url, student_id
       FROM users WHERE email = $1`,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.rows[0];

    // Check if user has a password set
    if (!user.password_hash) {
      return res.status(401).json({ error: "Account not fully set up. Please complete registration." });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Update last_login
    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      [user.id],
    );

    // Generate access token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        studentId: user.student_id,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
