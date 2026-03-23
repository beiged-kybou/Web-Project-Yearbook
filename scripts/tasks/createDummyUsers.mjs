import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD = process.env.DUMMY_PASSWORD || "passcode123";

const DEPARTMENTS = [
  { code: "CSE", name: "Computer Science and Engineering" },
  { code: "EEE", name: "Electrical and Electronic Engineering" },
  { code: "CEE", name: "Civil and Environmental Engineering" },
  { code: "MPE", name: "Mechanical and Production Engineering" },
  { code: "BTM", name: "Business & Technology Management" },
  { code: "MME", name: "Materials and Metallurgical Engineering" },
];

const CLUBS = [
  { code: "CS", name: "Computer Society", emailSuffix: "cs" },
  { code: "PS", name: "Photography Society", emailSuffix: "ps" },
  { code: "DS", name: "Debating Society", emailSuffix: "ds" },
  { code: "MS", name: "Music Society", emailSuffix: "ms" },
  { code: "AS", name: "Adventure Society", emailSuffix: "as" },
];

const ROOT_ADMINS = [
  {
    email: "mubtasimahmed@iut-dhaka.edu",
    displayName: "Mubtasim Ahmed",
    studentId: "220041243",
    firstName: "Mubtasim",
    lastName: "Ahmed",
    department: "CSE",
    graduationYear: 2027,
    role: "admin",
  },
  {
    email: "mahmudulsakib@iut-dhaka.edu",
    displayName: "Mahmudul Sakib",
    studentId: "220041231",
    firstName: "Mahmudul",
    lastName: "Sakib",
    department: "CSE",
    graduationYear: 2027,
    role: "admin",
  },
  {
    email: "ishmamtahmid@iut-dhaka.edu",
    displayName: "Ishmam Tahmid",
    studentId: "220041259",
    firstName: "Ishmam",
    lastName: "Tahmid",
    department: "CSE",
    graduationYear: 2027,
    role: "admin",
  },
];

const departmentAdmins = DEPARTMENTS.map((dept, index) => {
  const suffix = String(910000000 + index).padStart(9, "0");
  return {
    email: `admin_${dept.code.toLowerCase()}@iut-dhaka.edu`,
    displayName: `${dept.name} Admin`,
    studentId: suffix,
    firstName: dept.code,
    lastName: "Admin",
    department: dept.code,
    graduationYear: 2028,
    role: "admin",
  };
});

const clubAdmins = CLUBS.map((club, index) => {
  const suffix = String(920000000 + index).padStart(9, "0");
  return {
    email: `admin_${club.emailSuffix}@iut-dhaka.edu`,
    displayName: `IUT ${club.name} Admin`,
    studentId: suffix,
    firstName: club.name.split(" ")[0] || "Club",
    lastName: "Admin",
    department: "CSE",
    graduationYear: 2026,
    role: "admin",
  };
});

const USERS = [...ROOT_ADMINS, ...departmentAdmins, ...clubAdmins];

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
    `INSERT INTO users (email, password_hash, display_name, student_id, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       display_name = EXCLUDED.display_name,
       student_id = EXCLUDED.student_id,
       role = EXCLUDED.role`,
    [user.email, passwordHash, user.displayName, user.studentId, user.role || "student"],
  );
}

export async function createDummyUsers(pool) {
  await pool.query("BEGIN");

  try {
    for (const dept of DEPARTMENTS) {
      await ensureDepartment(pool, dept.code, dept.name);
    }

    const years = new Set(USERS.map((user) => user.graduationYear));
    for (const year of years) {
      await ensureYearbook(pool, year);
    }

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
