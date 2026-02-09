import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import styles from "../components/albums/Albums.module.css"; // Reuse grid styles
import AlbumCard from "../components/albums/AlbumCard";
import { User, Image } from "lucide-react";

// Mock Data
const MOCK_RESULTS = {
    students: [
        { student_id: "1904001", name: "John Doe", department: "CSE", graduation_year: 2024 },
        { student_id: "1904002", name: "Jane Smith", department: "ECE", graduation_year: 2024 },
    ],
    albums: [
        { id: 1, title: "CSE Batch 2026", type: "batch", photo_count: 120, cover_url: null, created_at: new Date().toISOString() },
    ]
};

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const [results, setResults] = useState({ students: [], albums: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!query) return;
        setLoading(true);
        // Simulate API search
        setTimeout(() => {
            // Very basic mock filtering could go here, but we just return mock
            setResults(MOCK_RESULTS);
            setLoading(false);
        }, 500);
    }, [query]);

    return (
        <div className="container">
            <h1 style={{ marginBottom: "1.5rem" }}>
                Search Results for "{query}"
            </h1>

            {loading ? (
                <div>Searching...</div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

                    <section>
                        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Students</h2>
                        {results.students.length > 0 ? (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                                    gap: "1rem"
                                }}
                            >
                                {results.students.map(student => (
                                    <Link
                                        to={`/profile/${student.student_id}`} // Assuming profile route handles IDs
                                        key={student.student_id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "1rem",
                                            padding: "1rem",
                                            backgroundColor: "var(--color-surface)",
                                            borderRadius: "0.5rem",
                                            border: "1px solid var(--color-border)",
                                            textDecoration: "none",
                                            color: "inherit"
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 40, height: 40, borderRadius: "50%",
                                                backgroundColor: "var(--color-bg)", display: "flex",
                                                alignItems: "center", justifyContent: "center"
                                            }}
                                        >
                                            <User size={20} className="text-muted" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{student.name}</div>
                                            <div className="text-muted" style={{ fontSize: "0.875rem" }}>
                                                {student.student_id} • {student.department}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted">No students found.</p>
                        )}
                    </section>

                    <section>
                        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Albums</h2>
                        {results.albums.length > 0 ? (
                            <div className={styles.albumsGrid}>
                                {results.albums.map(album => (
                                    <AlbumCard key={album.id} album={album} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted">No albums found.</p>
                        )}
                    </section>

                </div>
            )}
        </div>
    );
};

export default SearchResults;
