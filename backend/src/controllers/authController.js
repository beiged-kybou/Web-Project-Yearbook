import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import otpService from "../services/otpService.js";
import { sendOtpMail } from "../utils/mailer.js";
import { parseStudentName } from "../utils/parseStudentName.js";

export const requestOtp = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email || !/^[a-z0-9._%+-]+@iut-dhaka\.edu$/i.test(email)) {
    return res.status(400).json({ error: "A valid IUT email is required" });
  }
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
  const { registrationToken, password, accountName } = req.body;
  const pool = await req.app.locals.getPool();

  try {
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

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    if (!accountName || !accountName.trim()) {
      return res.status(400).json({ error: "Account name is required." });
    }

    const parsed = parseStudentName(accountName);
    if (!parsed) {
      return res.status(400).json({
        error: "Invalid account name format. Expected: 'Full Name 9-digit-StudentID' (e.g. 'John Doe 220104045').",
      });
    }

    const { fullName, firstName, lastName, studentId, batch, department } = parsed;

    if (!department) {
      return res.status(400).json({
        error: "Could not determine department from student ID. 5th digit must be 4 (CSE) or 5 (CEE).",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "User already registered." });
    }

    const studentLinkCheck = await pool.query(
      "SELECT id FROM users WHERE student_id = $1",
      [studentId],
    );

    if (studentLinkCheck.rows.length > 0) {
      return res.status(409).json({ error: "Student ID already linked to another account." });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const batchYear = parseInt("20" + batch, 10);
    const graduationYear = batchYear + 4;

    await pool.query(
      `INSERT INTO departments (code, name)
       VALUES ($1, $2)
       ON CONFLICT (code) DO NOTHING`,
      [department, department === "CSE" ? "Computer Science and Engineering" : "Civil and Environmental Engineering"],
    );

    await pool.query(
      `INSERT INTO yearbooks (year)
       VALUES ($1)
       ON CONFLICT (year) DO NOTHING`,
      [graduationYear],
    );

    await pool.query(
      `INSERT INTO students (student_id, first_name, last_name, email, department, graduation_year)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (student_id) DO UPDATE SET
         email = COALESCE(EXCLUDED.email, students.email),
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name`,
      [studentId, firstName, lastName, email, department, graduationYear],
    );

    const insertQuery = `
      INSERT INTO users (email, password_hash, display_name, student_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, display_name, role, created_at, student_id
    `;

    const result = await pool.query(insertQuery, [
      email,
      passwordHash,
      fullName,
      studentId,
    ]);

    const newUser = result.rows[0];

    await pool.query("DELETE FROM otp_verifications WHERE email = $1", [email]);

    const accessToken = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "Registration completed successfully.",
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        role: newUser.role,
        studentId: newUser.student_id,
        batch,
        department,
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

    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.display_name, u.role, u.avatar_url, u.student_id,
              s.department, s.graduation_year
       FROM users u
       LEFT JOIN students s ON u.student_id = s.student_id
       WHERE u.email = $1`,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ error: "Account not fully set up. Please complete registration." });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      [user.id],
    );

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const batchYear = user.graduation_year ? user.graduation_year - 4 : null;
    const batch = batchYear ? String(batchYear).slice(-2) : null;

    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        studentId: user.student_id,
        department: user.department,
        graduationYear: user.graduation_year,
        batch,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
