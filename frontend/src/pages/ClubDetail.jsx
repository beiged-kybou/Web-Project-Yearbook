import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { clubService } from "../services/api";
import "./Dashboard.css"; // Reuse dashboard styles for consistency

const ClubDetail = () => {
  const { clubCode } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // We need the club info to show the name/description
        const clubsResult = await clubService.listClubs();
        const foundClub = (clubsResult.clubs || []).find(c => c.code === clubCode);
        
        if (!foundClub) {
          setError("Club not found.");
          setLoading(false);
          return;
        }
        setClub(foundClub);

        // Fetch club-specific memories
        const memoriesResult = await clubService.getClubMemories(clubCode);
        setMemories(memoriesResult.memories || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load club details.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clubCode]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="scrapbook-page dashboard-page">
          <div className="spinner"></div>
          <p className="loading-text">Opening club archives...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="scrapbook-page dashboard-page">
          <button className="ghost" onClick={() => navigate("/dashboard")} style={{ marginBottom: '1rem' }}>
            ← Back to Dashboard
          </button>
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-inner">
          <h1 className="nav-title" onClick={() => navigate("/dashboard")} style={{ cursor: 'pointer' }}>
            IUT Yearbook
          </h1>
          <div className="nav-user">
            <button className="logout-btn" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="scrapbook-page welcome-banner">
          <div className="corner-pin top-left"></div>
          <div className="corner-pin top-right"></div>
          <div className="corner-pin bottom-left"></div>
          <div className="corner-pin bottom-right"></div>

          <div className="welcome-content">
            <h2 className="welcome-heading">{club?.name}</h2>
            <div className="welcome-badges">
              <span className="welcome-badge id-badge">{clubCode}</span>
              <span className="welcome-badge dept-badge">Club Archives</span>
            </div>
            <p className="empty-text" style={{ marginTop: '0.5rem', textTransform: 'none', textAlign: 'left' }}>
              {club?.description}
            </p>
          </div>
        </div>

        <div className="feed-container">
          {memories.length === 0 ? (
            <div className="scrapbook-page empty-state">
              <div className="empty-icon">--</div>
              <h3>No club memories yet</h3>
              <p className="empty-text">
                Members of {club?.name} haven't shared any memories here yet.
              </p>
            </div>
          ) : (
            <section className="feed-section">
              <h3 className="section-title">
                <span className="section-icon">~</span> Club Feed
              </h3>
              <div className="memories-grid">
                {memories.map((memory) => (
                  <div key={memory.id} className="memory-card">
                    <div className="memory-content">
                      <h4 className="memory-title">{memory.title}</h4>
                      <p className="memory-text">{memory.content}</p>
                      
                      {memory.images && memory.images.length > 0 && (
                        <div className="memory-images">
                          {memory.images.map((img) => (
                            <div key={img.id} className="polaroid memory-image-wrap">
                              <img src={img.url} alt="" loading="lazy" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="memory-footer">
                      <span className="meta-author">Shared by {memory.author_name}</span>
                      <span className="meta-date">{formatDate(memory.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClubDetail;
