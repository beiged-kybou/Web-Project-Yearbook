import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Should be in .env

export async function login(req, res) {
    try {
        const pool = await req.app.locals.getPool();
        const { identifier, password } = req.body; // identifier = email or student_id

        // Find student by email or ID
        const result = await pool.query(
            "SELECT * FROM students WHERE email = $1 OR student_id = $1",
            [identifier]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const student = result.rows[0];

        // Check password
        if (!student.password_hash) {
            return res.status(401).json({ error: "Account not set up. Please register first." });
        }

        const match = await bcrypt.compare(password, student.password_hash);

        if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate Token
        const token = jwt.sign(
            { id: student.student_id, role: "student" }, // Add role if you have admins
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Remove sensitive data
        delete student.password_hash;

        res.json({ token, user: student });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getMe(req, res) {
    try {
        // req.user is set by authMiddleware
        const pool = await req.app.locals.getPool();
        const result = await pool.query(
            "SELECT * FROM students WHERE student_id = $1",
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const student = result.rows[0];
        delete student.password_hash;

        res.json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Register acts as "activating" an account or creating a new one
export async function register(req, res) {
    // Reuse createStudent logic but add password hashing
    try {
        const pool = await req.app.locals.getPool();
        const {
            student_id,
            first_name,
            last_name,
            email,
            phone,
            department,
            photo_url,
            bio,
            motto,
            graduation_year,
            password
        } = req.body;

        if (!password) {
            return res.status(400).json({ error: "Password is required" });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await pool.query(
            `INSERT INTO students (
        student_id, first_name, last_name, email, phone,
        department, photo_url, bio, motto, graduation_year, password_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
            [
                student_id,
                first_name,
                last_name,
                email,
                phone,
                department,
                photo_url,
                bio,
                motto,
                graduation_year,
                passwordHash
            ],
        );

        const student = result.rows[0];
        delete student.password_hash;

        // Auto-login after register
        const token = jwt.sign(
            { id: student.student_id, role: "student" },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({ token, user: student });
    } catch (error) {
        if (error.code === "23505") {
            return res
                .status(409)
                .json({ error: "Student ID or Email already exists." });
        }
        res.status(500).json({ error: error.message });
    }
}
