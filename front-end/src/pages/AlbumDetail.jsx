import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import PhotoGrid from "../components/albums/PhotoGrid";
import Button from "../components/common/Button";
import UploadModal from "../components/albums/UploadModal";
import styles from "../components/albums/Albums.module.css";
import { Upload, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

// Mock Data
const MOCK_PHOTOS = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    url: `https://picsum.photos/400?random=${i}`,
    caption: `Memory ${i}`
}));

const AlbumDetail = () => {
    const { id } = useParams();
    const [album, setAlbum] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate Fetch
        setTimeout(() => {
            setAlbum({
                id,
                title: "CSE Batch 2026",
                type: "batch",
                description: "All our memories from the 4 years together.",
                created_at: new Date().toISOString()
            });
            setPhotos(MOCK_PHOTOS);
            setLoading(false);
        }, 500);
    }, [id]);

    const handleUpload = (newFiles) => {
        // Simulate adding photos
        const newPhotos = newFiles.map((file, i) => ({
            id: Date.now() + i,
            url: URL.createObjectURL(file), // In real app, this would be the uploaded URL
            caption: "New Upload"
        }));
        setPhotos(prev => [...newPhotos, ...prev]);
    };

    if (loading) return <div className="container">Loading album...</div>;
    if (!album) return <div className="container">Album not found</div>;

    return (
        <div className="container">
            <div className={styles.pageHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/albums" className="text-muted">
                        <ChevronLeft size={24} />
                    </Link>
                    <div>
                        <h1 style={{ marginBottom: '0.25rem' }}>{album.title}</h1>
                        <p className="text-muted">{album.type} • {photos.length} photos</p>
                    </div>
                </div>

                <Button onClick={() => setIsUploadOpen(true)}>
                    <Upload size={18} />
                    Add Photos
                </Button>
            </div>

            <p style={{ marginBottom: '1.5rem', maxWidth: '800px' }}>
                {album.description}
            </p>

            <PhotoGrid photos={photos} />

            {isUploadOpen && (
                <UploadModal
                    isOpen={isUploadOpen}
                    onClose={() => setIsUploadOpen(false)}
                    onUpload={handleUpload}
                />
            )}
        </div>
    );
};

export default AlbumDetail;
