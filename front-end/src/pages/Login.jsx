import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import styles from "./Login.module.css";

const Login = () => {
    const [formData, setFormData] = useState({
        identifier: "", // Email or Student ID
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(""); // Clear error on edit
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(formData);
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.error || "Failed to login. Please check your credentials.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Welcome Back</h1>
                    <p className={styles.subtitle}>Sign in to access your yearbook</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.errorAlert}>{error}</div>}

                    <Input
                        label="Email or Student ID"
                        name="identifier"
                        value={formData.identifier}
                        onChange={handleChange}
                        placeholder="e.g. 1904001 or john@example.com"
                        required
                        autoFocus
                    />

                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                    />

                    <div className={styles.actions}>
                        <Link to="/forgot-password" className={styles.forgotLink}>
                            Forgot Password?
                        </Link>
                    </div>

                    <Button type="submit" isLoading={loading} className={styles.submitBtn}>
                        Sign In
                    </Button>
                </form>

                <div className={styles.footer}>
                    <p>
                        Don't have an account?{" "}
                        <Link to="/register" className={styles.registerLink}>
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
