import { useState, useRef } from "react";
import Button from "../common/Button";
import styles from "./Albums.module.css"; // Reuse album styles
import { X, UploadCloud, Image } from "lucide-react";

const UploadModal = ({ isOpen, onClose, onUpload }) => {
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles]);

        // Create previews
        const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            // Revoke URL to prevent memory leaks
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleUpload = async () => {
        setUploading(true);
        // Simulate upload
        setTimeout(() => {
            onUpload(files);
            setUploading(false);
            setFiles([]);
            setPreviews([]);
            onClose();
        }, 1500);
    };

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
        }}>
            <div style={{
                backgroundColor: "var(--color-surface)", padding: "1.5rem", borderRadius: "1rem",
                width: "90%", maxWidth: "500px", maxHeight: "80vh", overflowY: "auto"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2>Upload Photos</h2>
                    <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}>
                        <X size={24} />
                    </button>
                </div>

                <div
                    className={styles.dropzone}
                    onClick={() => fileInputRef.current.click()}
                >
                    <UploadCloud size={48} color="var(--color-primary)" />
                    <p style={{ marginTop: "0.5rem" }}>Click to select photos</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                </div>

                {previews.length > 0 && (
                    <div className={styles.uploadPreviewGrid}>
                        {previews.map((src, index) => (
                            <div key={index} className={styles.previewItem}>
                                <img src={src} alt="preview" className={styles.previewImg} />
                                <button className={styles.removeBtn} onClick={() => removeFile(index)}>
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
                    <Button variant="secondary" onClick={onClose} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpload} isLoading={uploading} disabled={files.length === 0}>
                        Upload {files.length > 0 ? `(${files.length})` : ""}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;
