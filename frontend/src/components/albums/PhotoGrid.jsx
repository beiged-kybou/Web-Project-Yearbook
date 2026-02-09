import styles from "./Albums.module.css";

const PhotoGrid = ({ photos, onPhotoClick }) => {
    if (!photos || photos.length === 0) {
        return <div className="text-muted">No photos in this album yet.</div>;
    }

    return (
        <div className={styles.photoGrid}>
            {photos.map((photo) => (
                <div
                    key={photo.id}
                    className={styles.photoItem}
                    onClick={() => onPhotoClick && onPhotoClick(photo)}
                >
                    <img src={photo.url} alt="Memory" className={styles.photoImg} loading="lazy" />
                </div>
            ))}
        </div>
    );
};

export default PhotoGrid;
