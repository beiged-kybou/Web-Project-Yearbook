import { useState, useEffect } from "react";
// import api from "../../services/api";
import PhotoModerationCard from "../components/admin/PhotoModerationCard";
import styles from "../components/admin/Admin.module.css";

// Mock Data
const MOCK_PENDING = Array.from({ length: 5 }).map((_, i) => ({
    id: i,
    url: `https://picsum.photos/400?random=${i + 100}`,
    uploadedBy: `User ${i + 1}`
}));

const AdminDashboard = () => {
    const [pendingPhotos, setPendingPhotos] = useState([]);
    const [stats, setStats] = useState({ users: 0, photos: 0, pending: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate Fetch
        setTimeout(() => {
            setPendingPhotos(MOCK_PENDING);
            setStats({
                users: 150,
                photos: 1240,
                pending: 5
            });
            setLoading(false);
        }, 500);
    }, []);

    const handleApprove = (photo) => {
        // Call API
        setPendingPhotos(prev => prev.filter(p => p.id !== photo.id));
        setStats(prev => ({ ...prev, pending: prev.pending - 1, photos: prev.photos + 1 }));
    };

    const handleReject = (photo) => {
        // Call API
        setPendingPhotos(prev => prev.filter(p => p.id !== photo.id));
        setStats(prev => ({ ...prev, pending: prev.pending - 1 }));
    };

    if (loading) return <div className="container">Loading dashboard...</div>;

    return (
        <div className="container">
            <div className={styles.dashboardHeader}>
                <h1>Admin Dashboard</h1>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{stats.users}</div>
                    <div className={styles.statLabel}>Total Students</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{stats.photos}</div>
                    <div className={styles.statLabel}>Total Memories</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue} style={{ color: "var(--color-warning)" }}>
                        {stats.pending}
                    </div>
                    <div className={styles.statLabel}>Pending Approval</div>
                </div>
            </div>

            <h2 className={styles.sectionTitle}>Pending Photos</h2>
            {pendingPhotos.length === 0 ? (
                <p className="text-muted">No photos pending approval.</p>
            ) : (
                <div className={styles.moderationGrid}>
                    {pendingPhotos.map(photo => (
                        <PhotoModerationCard
                            key={photo.id}
                            photo={photo}
                            onApprove={handleApprove}
                            onReject={handleReject}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
