import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import styles from "./Login.module.css"; // Reusing Login styles for consistency
import registerStyles from "./Register.module.css";
import { cn } from "../utils/cn";

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        student_id: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        department: "",
        graduation_year: new Date().getFullYear(),
        password: "",
        confirmPassword: ""
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            // Remove confirmPassword before sending
            const { confirmPassword, ...dataToSend } = formData;
            await register(dataToSend);
            // Navigate to login or auto-login
            navigate("/login", { state: { message: "Account created successfully! Please login." } });
        } catch (err) {
            setError(err.response?.data?.error || "Failed to create account.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={cn(styles.card, registerStyles.card)}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Create Account</h1>
                    <p className={styles.subtitle}>Join your batchmates in Year-Book</p>
                </div>

                <form onSubmit={handleSubmit} className={cn(styles.form, registerStyles.formGrid)}>
                    {error && <div className={cn(styles.errorAlert, registerStyles.fullWidth)}>{error}</div>}

                    <Input
                        label="Student ID"
                        name="student_id"
                        value={formData.student_id}
                        onChange={handleChange}
                        required
                        placeholder="e.g. 1904001"
                        className={registerStyles.fullWidth}
                    />

                    <Input
                        label="First Name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label="Last Name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={registerStyles.fullWidth}
                    />

                    <Input
                        label="Department"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required
                        placeholder="e.g. CSE"
                    />

                    <Input
                        label="Graduation Year"
                        name="graduation_year"
                        type="number"
                        value={formData.graduation_year}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Min 8 chars"
                    />

                    <Input
                        label="Confirm Password"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="Confirm password"
                    />

                    <Button
                        type="submit"
                        isLoading={loading}
                        className={cn(styles.submitBtn, registerStyles.fullWidth)}
                        style={{ marginTop: '1rem' }}
                    >
                        Create Account
                    </Button>
                </form>

                <div className={styles.footer}>
                    <p>
                        Already have an account?{" "}
                        <Link to="/login" className={styles.registerLink}>
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
