import Button from "../common/Button";
import styles from "./Admin.module.css";
import { Check, X } from "lucide-react";

const PhotoModerationCard = ({ photo, onApprove, onReject }) => {
    return (
        <div className={styles.moderationCard}>
            <div className={styles.imageWrapper}>
                <img src={photo.url} alt="Pending approval" />
                <div className={styles.uploaderInfo}>
                    Uploaded by: {photo.uploadedBy}
                </div>
            </div>

            <div className={styles.actions}>
                <Button
                    className={styles.rejectBtn}
                    onClick={() => onReject(photo)}
                    title="Reject"
                >
                    <X size={20} />
                    Reject
                </Button>
                <Button
                    variant="primary"
                    className={styles.approveBtn}
                    onClick={() => onApprove(photo)}
                    title="Approve"
                >
                    <Check size={20} />
                    Approve
                </Button>
            </div>
        </div>
    );
};

export default PhotoModerationCard;
