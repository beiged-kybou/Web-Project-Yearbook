import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { yearbookService } from '../services/api';
import Flipbook from '../components/Flipbook/Flipbook';

const YearbookViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [yearbook, setYearbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchYearbook = async () => {
      try {
        setLoading(true);
        // Try the public endpoint (it works for personal yearbooks marked as published)
        const data = await yearbookService.getPublishedRelease(id);
        setYearbook(data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || "Yearbook not found.");
      } finally {
        setLoading(false);
      }
    };
    fetchYearbook();
  }, [id]);

  if (loading) return (
    <div className="dashboard-container">
      <div className="scrapbook-page dashboard-page">
        <div className="spinner"></div>
        <p className="loading-text">Opening the flipbook...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="dashboard-container">
      <div className="scrapbook-page dashboard-page">
        <button className="ghost" onClick={() => navigate("/dashboard")} style={{ marginBottom: '1rem' }}>
          ← Back to Dashboard
        </button>
        <div className="error-message">{error}</div>
      </div>
    </div>
  );

  // Map backend "release" and "pages" to what Flipbook expects
  const mappedYearbook = {
    title: yearbook.release.title,
    description: yearbook.release.introText || yearbook.release.theme,
    coverImageUrl: yearbook.release.coverPhotoUrl,
    pages: yearbook.pages.map(p => ({
      memoryId: {
        title: p.title,
        content: p.attachments?.[0]?.snapshot?.body || "",
        created_at: p.created_at,
        participants: [{ studentId: { firstName: p.attachments?.[0]?.snapshot?.authorName || "Member" } }],
        images: p.images.map(img => ({ url: img.url }))
      }
    }))
  };

  return (
    <div className="dashboard-container" style={{ minHeight: '100vh', background: 'var(--tui-col-base)' }}>
       <nav className="dashboard-nav">
        <div className="nav-inner">
          <h1 className="nav-title" onClick={() => navigate("/dashboard")} style={{ cursor: 'pointer' }}>
            IUT Yearbook
          </h1>
          <div className="nav-user">
            <button className="logout-btn" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>
            <button className="post-btn" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Link copied to clipboard!");
            }}>
              Share Link
            </button>
          </div>
        </div>
      </nav>
      <div style={{ padding: '2rem 0' }}>
        <Flipbook yearbook={mappedYearbook} />
      </div>
    </div>
  );
};

export default YearbookViewer;
