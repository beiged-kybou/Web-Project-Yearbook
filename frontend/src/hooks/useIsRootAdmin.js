const ROOT_ADMIN_EMAILS = new Set([
  'mubtasimahmed@iut-dhaka.edu',
  'mahmudulsakib@iut-dhaka.edu',
  'ishmamtahmid@iut-dhaka.edu',
]);

const normalizeEmail = (value = '') => value.trim().toLowerCase();

export const isRootAdminEmail = (email = '') => ROOT_ADMIN_EMAILS.has(normalizeEmail(email));

const useIsRootAdmin = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return isRootAdminEmail(user.email);
};

export default useIsRootAdmin;
