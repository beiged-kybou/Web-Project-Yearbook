import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD = process.env.DUMMY_PASSWORD || "passcode123";

const USERS = [
  {
    email: "mubtasimahmed@iut-dhaka.edu",
    displayName: "Mubtasim Ahmed",
    studentId: "220041243",
    firstName: "Mubtasim",
    lastName: "Ahmed",
    department: "CSE",
    graduationYear: 2027,
  },
  {
    email: "mahmudulsakib@iut-dhaka.edu",
    displayName: "Mahmudul Sakib",
    studentId: "220041231",
    firstName: "Mahmudul",
    lastName: "Sakib",
    department: "CSE",
    graduationYear: 2027,
  },
  {
    email: "ishmamtahmid@iut-dhaka.edu",
    displayName: "Ishmam Tahmid",
    studentId: "220041259",
    firstName: "Ishmam",
    lastName: "Tahmid",
    department: "CSE",
    graduationYear: 2027,
  },
];

async function ensureDepartment(pool, code, name) {
  await pool.query(
    `INSERT INTO departments (code, name)
     VALUES ($1, $2)
     ON CONFLICT (code) DO NOTHING`,
    [code, name],
  );
}

async function ensureYearbook(pool, year) {
  await pool.query(
    `INSERT INTO yearbooks (year)
     VALUES ($1)
     ON CONFLICT (year) DO NOTHING`,
    [year],
  );
}

async function upsertStudent(pool, user) {
  await pool.query(
    `INSERT INTO students (student_id, first_name, last_name, email, department, graduation_year)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (student_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       email = EXCLUDED.email,
       department = EXCLUDED.department,
       graduation_year = EXCLUDED.graduation_year`,
    [
      user.studentId,
      user.firstName,
      user.lastName,
      user.email,
      user.department,
      user.graduationYear,
    ],
  );
}

async function upsertUser(pool, user) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, display_name, student_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       display_name = EXCLUDED.display_name,
       student_id = EXCLUDED.student_id`,
    [user.email, passwordHash, user.displayName, user.studentId],
  );
}

export async function createDummyUsers(pool) {
  await pool.query("BEGIN");

  try {
    await ensureDepartment(pool, "CSE", "Computer Science and Engineering");
    await ensureYearbook(pool, 2027);

    for (const user of USERS) {
      await upsertStudent(pool, user);
      await upsertUser(pool, user);
      console.log(` - ensured ${user.email}`);
    }

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

export default createDummyUsers;
