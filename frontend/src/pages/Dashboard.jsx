import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('department');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const result = await dashboardService.getDashboard();
      setData(result);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="scrapbook-page dashboard-page">
          <div className="spinner"></div>
          <p className="loading-text">Opening your yearbook...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="scrapbook-page dashboard-page">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  const { user, department, batch } = data;
  const activeGroup = activeTab === 'department' ? department : batch;
  const hasContent = activeGroup.albums.length > 0 || activeGroup.memories.length > 0;

  return (
    <div className="dashboard-container">
      {/* Top Navigation Bar */}
      <nav className="dashboard-nav">
        <div className="nav-inner">
          <h1 className="nav-title">IUT Yearbook</h1>
          <div className="nav-user">
            <div className="user-avatar">
              {user.displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="user-info">
              <span className="user-name">{user.displayName}</span>
              <span className="user-meta">{user.department} &middot; Batch '{user.batch}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Welcome Banner */}
        <div className="scrapbook-page welcome-banner">
          <div className="corner-pin top-left"></div>
          <div className="corner-pin top-right"></div>
          <div className="corner-pin bottom-left"></div>
          <div className="corner-pin bottom-right"></div>

          <div className="welcome-content">
            <h2 className="welcome-heading">
              Welcome back, {user.firstName || user.displayName}!
            </h2>
            <div className="welcome-badges">
              <span className="welcome-badge dept-badge">
                {user.department}
              </span>
              <span className="welcome-badge batch-badge">
                Batch '{user.batch}
              </span>
              <span className="welcome-badge id-badge">
                {user.studentId}
              </span>
            </div>
          </div>
        </div>

        {/* Group Tabs */}
        <div className="group-tabs">
          <button
            className={`tab-btn ${activeTab === 'department' ? 'active' : ''}`}
            onClick={() => setActiveTab('department')}
          >
            <span className="tab-icon">🏛️</span>
            <span className="tab-label">{department.code} Department</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
            onClick={() => setActiveTab('batch')}
          >
            <span className="tab-icon">🎓</span>
            <span className="tab-label">Batch {batch.label}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="feed-container">
          {!hasContent ? (
            <div className="scrapbook-page empty-state">
              <div className="empty-icon">📖</div>
              <h3>No memories yet</h3>
              <p className="empty-text">
                Be the first to share a memory with your{' '}
                {activeTab === 'department' ? 'department' : 'batch'}!
              </p>
            </div>
          ) : (
            <>
              {/* Albums Section */}
              {activeGroup.albums.length > 0 && (
                <section className="feed-section">
                  <h3 className="section-title">
                    <span className="section-icon">📚</span> Albums
                  </h3>
                  <div className="albums-grid">
                    {activeGroup.albums.map((album) => (
                      <div key={album.id} className="scrapbook-page album-card">
                        <div className="album-header">
                          <h4 className="album-title">{album.title}</h4>
                          {album.description && (
                            <p className="album-desc">{album.description}</p>
                          )}
                          <div className="album-meta">
                            <span className="meta-author">by {album.created_by_name}</span>
                            <span className="meta-date">{formatDate(album.created_at)}</span>
                          </div>
                        </div>

                        {album.memories && album.memories.length > 0 && (
                          <div className="album-memories">
                            {album.memories.map((memory) => (
                              <MemoryCard key={memory.id} memory={memory} formatDate={formatDate} />
                            ))}
                          </div>
                        )}

                        {(!album.memories || album.memories.length === 0) && (
                          <p className="album-empty">No memories in this album yet</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Standalone Memories Section */}
              {activeGroup.memories.length > 0 && (
                <section className="feed-section">
                  <h3 className="section-title">
                    <span className="section-icon">✨</span> Recent Memories
                  </h3>
                  <div className="memories-grid">
                    {activeGroup.memories.map((memory) => (
                      <MemoryCard key={memory.id} memory={memory} formatDate={formatDate} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

/* Memory Card sub-component */
const MemoryCard = ({ memory, formatDate }) => (
  <div className="memory-card">
    <div className="memory-content">
      <h4 className="memory-title">{memory.title}</h4>
      {memory.content && <p className="memory-text">{memory.content}</p>}

      {/* Images */}
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
      <span className="meta-author">{memory.created_by_name}</span>
      <span className="meta-date">{formatDate(memory.created_at)}</span>
    </div>
  </div>
);

export default Dashboard;
