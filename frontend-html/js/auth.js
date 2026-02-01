
// Mock Credentials
const ADMIN_APP_CREDENTIALS = {
    identifier: "admin",
    password: "admin"
};

const MOCK_USER_CREDENTIALS = {
    identifier: "user",
    password: "user"
};

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const identifier = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;

        if (identifier === ADMIN_APP_CREDENTIALS.identifier && password === ADMIN_APP_CREDENTIALS.password) {
            // Admin Login
            localStorage.setItem('role', 'admin');
            window.location.href = 'admin-dashboard.html';
        } else {
            // Assume any other valid input is a normal user (for demo purposes)
            // In a real app, we'd verify against a database
            localStorage.setItem('role', 'student');
            window.location.href = 'dashboard.html';
        }
    });
});
