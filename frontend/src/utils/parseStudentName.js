const DEPARTMENT_MAP = {
  '4': 'CSE',
  '5': 'CEE',
};

export function parseStudentName(nameString) {
  if (!nameString || typeof nameString !== 'string') return null;

  const parts = nameString.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const lastWord = parts[parts.length - 1];

  if (!/^\d{9}$/.test(lastWord)) return null;

  const studentId = lastWord;
  const nameParts = parts.slice(0, -1);
  const fullName = nameParts.join(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const batch = studentId.substring(0, 2);
  const deptDigit = studentId.charAt(4);
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
