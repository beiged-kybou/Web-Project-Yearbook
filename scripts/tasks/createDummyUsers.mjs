import bcrypt from "bcryptjs";
import Department from "../../backend/src/models/Department.js";
import Yearbook from "../../backend/src/models/Yearbook.js";
import Student from "../../backend/src/models/Student.js";
import User from "../../backend/src/models/User.js";

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

async function ensureDepartment(code, name) {
  await Department.findOneAndUpdate(
    { code },
    { name },
    { upsert: true, new: true }
  );
}

async function ensureYearbook(year) {
  await Yearbook.findOneAndUpdate(
    { year },
    {},
    { upsert: true, new: true }
  );
}

async function upsertStudent(user) {
  await Student.findOneAndUpdate(
    { studentId: user.studentId },
    {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department,
      graduationYear: user.graduationYear,
    },
    { upsert: true, new: true }
  );
}

async function upsertUser(user) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await User.findOneAndUpdate(
    { email: user.email },
    {
      passwordHash,
      displayName: user.displayName,
      studentId: user.studentId,
      role: user.role || "student",
    },
    { upsert: true, new: true }
  );
}

export async function createDummyUsers() {
  try {
    for (const dept of DEPARTMENTS) {
      await ensureDepartment(dept.code, dept.name);
    }

    const years = new Set(USERS.map((user) => user.graduationYear));
    for (const year of years) {
      await ensureYearbook(year);
    }

    for (const user of USERS) {
      await upsertStudent(user);
      await upsertUser(user);
      console.log(` - ensured ${user.email}`);
    }
  } catch (error) {
    throw error;
  }
}

export default createDummyUsers;
