/**
 * Parses an IUT student's full account name string.
 *
 * Convention:  "Firstname Middlename... Lastname STUDENTID"
 *   - The last word is the 9-digit student ID.
 *   - Everything before it is the full name.
 *   - First 2 digits of the ID → batch  (e.g. 22 → batch '22)
 *   - 5th digit of the ID → department  (4 → CSE, 5 → CEE)
 *
 * @param {string} nameString - The raw name string from the account.
 * @returns {{ fullName: string, firstName: string, lastName: string,
 *             studentId: string, batch: string, department: string } | null}
 */

const DEPARTMENT_MAP = {
  "4": "CSE",
  "5": "CEE",
};

export function parseStudentName(nameString) {
  if (!nameString || typeof nameString !== "string") return null;

  const parts = nameString.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const lastWord = parts[parts.length - 1];

  // Validate student ID: must be exactly 9 digits
  if (!/^\d{9}$/.test(lastWord)) return null;

  const studentId = lastWord;
  const nameParts = parts.slice(0, -1);
  const fullName = nameParts.join(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  const batch = studentId.substring(0, 2); // first 2 digits
  const deptDigit = studentId.charAt(4); // 5th digit (0-indexed: 4)
  const department = DEPARTMENT_MAP[deptDigit] || null;

  return {
    fullName,
    firstName,
    lastName,
    studentId,
    batch,
    department,
  };
}

export { DEPARTMENT_MAP };
