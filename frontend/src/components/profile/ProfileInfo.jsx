import styles from "./Profile.module.css";

const ProfileInfo = ({ user }) => {
    return (
        <div className={styles.infoSection}>
            <div className={styles.mainInfo}>
                <h1>{user.first_name} {user.last_name}</h1>
                <div className={styles.metaInfo}>
                    <span>{user.department}</span>
                    <span>•</span>
                    <span>Batch {user.graduation_year}</span>
                </div>

                {user.motto && (
                    <div className={styles.motto}>
                        "{user.motto}"
                    </div>
                )}

                <div className={styles.bio}>
                    <h3>About Me</h3>
                    <p>{user.bio || "No bio added yet."}</p>
                </div>
            </div>

            <div className={styles.detailsCard}>
                <h3>Student Details</h3>

                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Student ID</span>
                    <span className={styles.detailValue}>{user.student_id}</span>
                </div>

                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Email</span>
                    <span className={styles.detailValue}>{user.email}</span>
                </div>

                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Phone</span>
                    <span className={styles.detailValue}>{user.phone || "N/A"}</span>
                </div>
            </div>
        </div>
    );
};

export default ProfileInfo;
