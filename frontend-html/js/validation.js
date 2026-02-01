
// Configuration
const DEPT_CODES = {
    '1': 'MPE',
    '2': 'EEE',
    '4': 'CSE',
    '5': 'CEE',
    '6': 'BTM'
};

const IUT_EMAIL_DOMAIN = 'iut-dhaka.edu';

/**
 * Validates Student ID format and consistency with Dept/Batch
 * @param {string} studentId - 9 digit ID
 * @returns {object} { isValid, error, batch, dept }
 */
function validateStudentId(studentId) {
    if (!/^\d{9}$/.test(studentId)) {
        return { isValid: false, error: "Student ID must be exactly 9 digits" };
    }

    const year = studentId.substring(0, 2);
    const batch = "20" + year;
    const deptDigit = studentId.charAt(4);
    const dept = DEPT_CODES[deptDigit];

    if (!dept) {
        return { isValid: false, error: "Invalid department code in ID (5th digit)" };
    }

    return { isValid: true, batch, dept };
}

/**
 * Validates IUT Email
 * @param {string} email 
 * @returns {boolean}
 */
function validateEmail(email) {
    return email.endsWith(`@${IUT_EMAIL_DOMAIN}`);
}

/**
 * Main validation function for registration form
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const idInput = document.getElementById('studentId');
    const batchInput = document.getElementById('batch');
    const deptInput = document.getElementById('dept');
    const emailInput = document.getElementById('email');

    // Real-time ID validation to auto-fill Batch/Dept
    idInput.addEventListener('input', (e) => {
        const id = e.target.value;
        if (id.length === 9) {
            const result = validateStudentId(id);
            if (result.isValid) {
                batchInput.value = result.batch;
                deptInput.value = result.dept;
                idInput.setCustomValidity('');
            } else {
                idInput.setCustomValidity(result.error);
                batchInput.value = '';
                deptInput.value = '';
            }
        } else {
            batchInput.value = '';
            deptInput.value = '';
        }
    });

    // Form submission validation
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = idInput.value;
        const email = emailInput.value;

        const idCheck = validateStudentId(id);
        if (!idCheck.isValid) {
            alert(idCheck.error);
            return;
        }

        if (!validateEmail(email)) {
            alert(`Email must end with @${IUT_EMAIL_DOMAIN}`);
            return;
        }

        // Mock successful registration
        alert("Registration Successful! Please login.");
        window.location.href = 'login.html';
    });
});
