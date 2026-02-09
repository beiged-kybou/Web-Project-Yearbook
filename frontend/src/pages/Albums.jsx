import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AlbumCard from "../components/albums/AlbumCard";
import Button from "../components/common/Button";
import styles from "../components/albums/Albums.module.css";
// import api from "../services/api";
import { Plus } from "lucide-react";

// Mock data until API is ready
const MOCK_ALBUMS = [
    { id: 1, title: "CSE Batch 2026", type: "batch", photo_count: 120, cover_url: null, created_at: new Date().toISOString() },
    { id: 2, title: "Farewell Party", type: "common", photo_count: 45, cover_url: null, created_at: new Date().toISOString() },
    { id: 3, title: "My Personal Clicks", type: "personal", photo_count: 12, cover_url: null, created_at: new Date().toISOString() },
];

const Albums = () => {
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate API fetch
        setTimeout(() => {
            setAlbums(MOCK_ALBUMS);
            setLoading(false);
        }, 500);
    }, []);

    return (
        <div className="container">
            <div className={styles.pageHeader}>
                <h1>Albums</h1>
                <Link to="/albums/create">
                    <Button>
                        <Plus size={18} />
                        Create Album
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div>Loading albums...</div>
            ) : (
                <div className={styles.albumsGrid}>
                    {albums.map((album) => (
                        <AlbumCard key={album.id} album={album} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Albums;
