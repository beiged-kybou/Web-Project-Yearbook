import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import styles from "./Layout.module.css";

const Layout = () => {
    return (
        <div className={styles.layout}>
            <Navbar />
            <main className={styles.main}>
                <Outlet />
            </main>
            <footer className={styles.footer}>
                <div className={styles.container}>
                    <p>© {new Date().getFullYear()} Year-Book. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
