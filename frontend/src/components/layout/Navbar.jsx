import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import styles from "./Navbar.module.css";
import { LogOut, User, Search, Book } from "lucide-react";

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link to="/" className={styles.brand}>
                    <Book className={styles.logoIcon} />
                    <span className={styles.brandText}>Year-Book</span>
                </Link>

                {user && (
                    <>
                        <div className={styles.searchBar}>
                            <Search className={styles.searchIcon} size={18} />
                            <input
                                type="text"
                                placeholder="Search students, albums..."
                                className={styles.searchInput}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        navigate(`/search?q=${e.target.value}`);
                                    }
                                }}
                            />
                        </div>

                        <div className={styles.navLinks}>
                            <Link to="/home" className={styles.link}>Home</Link>
                            <Link to="/albums" className={styles.link}>Albums</Link>
                            <Link to="/profile" className={styles.link}>Profile</Link>
                        </div>

                        <div className={styles.userMenu}>
                            <span className={styles.userName}>
                                {user.first_name || "Student"}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className={styles.logoutBtn}
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </Button>
                        </div>
                    </>
                )}

                {!user && (
                    <div className={styles.navLinks}>
                        <Link to="/login">
                            <Button variant="ghost">Login</Button>
                        </Link>
                        <Link to="/register">
                            <Button>Sign Up</Button>
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
