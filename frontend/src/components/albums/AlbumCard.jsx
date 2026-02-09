import { Link } from "react-router-dom";
import styles from "./Albums.module.css";
import { Image, Users, Layers } from "lucide-react";

const AlbumCard = ({ album }) => {
    // Determine icon based on type
    const getIcon = (type) => {
        switch (type) {
            case 'personal': return <User size={16} />;
            case 'group': return <Users size={16} />;
            case 'batch': return <Layers size={16} />;
            default: return <Image size={16} />;
        }
    };

    return (
        <Link to={`/albums/${album.id}`} className={styles.albumCard}>
            <div className={styles.albumCover}>
                {album.cover_url ? (
                    <img src={album.cover_url} alt={album.title} />
                ) : (
                    <div className={styles.albumPlaceholder}>
                        <Image size={48} />
                    </div>
                )}
                <div className={styles.albumTypeBadge}>
                    {album.type}
                </div>
            </div>

            <div className={styles.albumInfo}>
                <h3 className={styles.albumTitle}>{album.title}</h3>
                <p className={styles.albumMeta}>
                    {album.photo_count} photos • {new Date(album.created_at).toLocaleDateString()}
                </p>
            </div>
        </Link>
    );
};

export default AlbumCard;
