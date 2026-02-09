import styles from "./Profile.module.css";
import Button from "../common/Button";
import { Camera, Edit2 } from "lucide-react";

// Placeholder for Avatar component if not created yet, or use img
const Avatar = ({ src, size = "lg", className }) => {
    return (
        <div className={`${styles.avatarContainer} ${styles[size]} ${className}`}>
            {src ? (
                <img src={src} alt="Profile" className={styles.avatarImg} />
            ) : (
                <div className={styles.avatarPlaceholder}>
                    <User size={size === "lg" ? 64 : 32} />
                </div>
            )}
        </div>
    );
};
import { User } from "lucide-react";

const ProfileHeader = ({ user, isOwnProfile, onEdit }) => {
    return (
        <div className={styles.header}>
            <div className={styles.coverImage}>
                {/* Placeholder gradient if no cover image */}
                <div className={styles.coverPlaceholder} />

                {isOwnProfile && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className={styles.editCoverBtn}
                        title="Change Cover"
                    >
                        <Camera size={18} />
                    </Button>
                )}
            </div>

            <div className={styles.headerContent}>
                <div className={styles.profileImageWrapper}>
                    <Avatar src={user.photo_url} size="xl" />
                    {isOwnProfile && (
                        <button className={styles.editPhotoBtn} title="Change Photo">
                            <Camera size={16} />
                        </button>
                    )}
                </div>

                <div className={styles.headerActions}>
                    {isOwnProfile && (
                        <Button variant="secondary" size="sm" onClick={onEdit}>
                            <Edit2 size={16} />
                            Edit Profile
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;
