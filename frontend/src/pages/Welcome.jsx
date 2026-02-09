import { Link } from "react-router-dom";
import Button from "../components/common/Button";
import styles from "./Welcome.module.css";
import { Book, Users, Layers } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Welcome = () => {
  const { user } = useAuth();

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.logoWrapper}>
            <Book size={64} className={styles.logoIcon} />
          </div>
          <h1 className={styles.title}>IUT YEAR BOOK</h1>
          <p className={styles.subtitle}>
            Capturing memories, celebrating friendships, and keeping the batch spirit alive forever.
          </p>

          <div className={styles.ctaGroup}>
            {user ? (
              <Link to="/home">
                <Button size="lg" className={styles.loginBtn}>
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button size="lg" className={styles.loginBtn}>
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="lg" variant="secondary" className={styles.registerBtn}>
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid (Optional visual filler) */}
      <section className={styles.features}>
        <div className={styles.featureCard}>
          <Users className={styles.featureIcon} />
          <h3>Connect</h3>
          <p>Find and stay in touch with your batchmates and department peers.</p>
        </div>
        <div className={styles.featureCard}>
          <Layers className={styles.featureIcon} />
          <h3>Memories</h3>
          <p>Share photos and create albums to preserve your university days.</p>
        </div>
      </section>
    </div>
  );
};

export default Welcome;
