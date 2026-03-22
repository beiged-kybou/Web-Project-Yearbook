const normalizeEmail = (value = "") => value.trim().toLowerCase();

const ROOT_ADMIN_EMAILS = [
  "mubtasimahmed@iut-dhaka.edu",
  "mahmudulsakib@iut-dhaka.edu",
  "ishmamtahmid@iut-dhaka.edu",
];

const ROOT_ADMIN_SET = new Set(ROOT_ADMIN_EMAILS.map(normalizeEmail));

export const isRootAdmin = (email = "") => ROOT_ADMIN_SET.has(normalizeEmail(email));

export const rootAdminList = [...ROOT_ADMIN_EMAILS];
