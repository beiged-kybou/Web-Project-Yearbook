import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import otpService from "../services/otpService.js";
import { sendOtpMail } from "../utils/mailer.js";
import { parseStudentName } from "../utils/parseStudentName.js";
import { isRootAdmin } from "../config/rootAdmins.js";
import User from "../models/User.js";
import OtpVerification from "../models/OtpVerification.js";
import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Yearbook from "../models/Yearbook.js";

export const requestOtp = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email || !/^[a-z0-9._%+-]+@iut-dhaka\.edu$/i.test(email)) {
    return res.status(400).json({ error: "A valid IUT email is required" });
  }

  try {
    const existingUser = await User.findOne({ email: new RegExp('^' + email + '$', 'i') }).select("role");
    
    if (existingUser) {
      const existingRole = existingUser.role;
      return res.status(409).json({
        error:
          existingRole === "admin"
            ? "This account already has administrative access."
            : "Email already registered",
      });
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
    const verification = await OtpVerification.findOne({ email: new RegExp('^' + email + '$', 'i') });

    if (!verification) {
      return res.status(404).json({ error: "No pending verification found." });
    }

    if (verification.attempts >= 5) {
      return res
        .status(429)
        .json({ error: "Too many attempts. Please request a new OTP." });
    }

    if (otpService.isOtpExpired(verification.expiresAt)) {
      return res.status(410).json({ error: "OTP expired." });
    }

    const isValid = otpService.verifyOtp(otp, verification.otpHash);

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
      { expiresIn: "15m" }
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
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long." });
    }

    if (!accountName || !accountName.trim()) {
      return res.status(400).json({ error: "Account name is required." });
    }

    const parsed = parseStudentName(accountName);
    if (!parsed) {
      return res.status(400).json({
        error:
          "Invalid account name format. Expected: 'Full Name 9-digit-StudentID' (e.g. 'John Doe 220041243').",
      });
    }

    const { fullName, firstName, lastName, studentId, batch, department } = parsed;

    if (!department) {
      return res.status(400).json({
        error:
          "Could not determine department from student ID. 5th digit must be 4 (CSE) or 5 (CEE).",
      });
    }

    const existingUserByEmail = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
    if (existingUserByEmail) {
      return res.status(409).json({ error: "User already registered." });
    }

    const studentOpt = await Student.findOne({ studentId });
    if (studentOpt) {
       const studentLinkCheck = await User.findOne({ studentId: studentOpt._id });
       if (studentLinkCheck) {
         return res
           .status(409)
           .json({ error: "Student ID already linked to another account." });
       }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const batchYear = parseInt("20" + batch, 10);
    const graduationYear = batchYear + 4;

    await Department.findOneAndUpdate(
      { code: department },
      { $setOnInsert: { name: department === "CSE" ? "Computer Science and Engineering" : "Civil and Environmental Engineering" } },
      { upsert: true, new: true }
    );

    const yearbookObj = await Yearbook.findOneAndUpdate(
      { year: graduationYear },
      { $setOnInsert: { theme: null } },
      { upsert: true, new: true, returnDocument: 'after' }
    );

    const studentRec = await Student.findOneAndUpdate(
      { studentId },
      {
         $set: {
            firstName: firstName, 
            lastName: lastName,
            graduationYear: graduationYear,
            department
         },
         $setOnInsert: { email }
      },
      { upsert: true, new: true, returnDocument: 'after' }
    );

    const newUser = await User.create({
      email,
      passwordHash,
      displayName: fullName,
      studentId: studentRec._id,
      role: isRootAdmin(email) ? "admin" : "student"
    });

    await OtpVerification.deleteOne({ email });

    const accessToken = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Registration completed successfully.",
      user: {
        id: newUser._id,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        studentId: studentRec.studentId,
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

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') }).populate({
        path: 'studentId'
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.passwordHash) {
      return res
        .status(401)
        .json({
          error: "Account not fully set up. Please complete registration.",
        });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const gradYear = user.studentId?.graduationYear;
    const batchYear = gradYear ? gradYear - 4 : null;
    const batch = batchYear ? String(batchYear).slice(-2) : null;

    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        studentId: user.studentId?.studentId,
        department: user.studentId?.department,
        graduationYear: gradYear,
        batch,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
