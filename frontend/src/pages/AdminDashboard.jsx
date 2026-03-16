import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const result = await adminService.getDashboard();
      setData(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleMemoryDecision = async (memoryId, decision) => {
    try {
      setActionMessage('');
      await adminService.decideMemory(memoryId, decision);
      setActionMessage('Memory updated');
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update memory');
    }
  };

  const handleTagDecision = async (tagId, decision) => {
    try {
      setActionMessage('');
      await adminService.decideTag(tagId, decision);
      setActionMessage('Tag request updated');
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update tag request');
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="scrapbook-page admin-page">
          <div className="spinner" />
          <p className="loading-text">Gathering updates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="scrapbook-page admin-page">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="admin-container">
      <div className="scrapbook-page admin-page">
        <div className="corner-pin top-left"></div>
        <div className="corner-pin top-right"></div>
        <div className="corner-pin bottom-left"></div>
        <div className="corner-pin bottom-right"></div>

        <header className="admin-header">
          <div>
            <p className="eyebrow">IUT Yearbook Admin</p>
            <h1>Control Center</h1>
          </div>
          <div className="admin-actions">
            <button type="button" onClick={loadDashboard}>Refresh</button>
            <button type="button" className="primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </header>

        {actionMessage && <div className="success-message">{actionMessage}</div>}

        <section className="metrics-grid">
          <MetricCard label="Total Users" value={metrics.total_users} />
          <MetricCard label="Total Students" value={metrics.total_students} />
          <MetricCard label="Memories" value={metrics.total_memories} />
          <MetricCard label="Memories (7d)" value={metrics.memories_this_week} />
          <MetricCard label="Pending Memories" value={metrics.pending_memories} highlight />
          <MetricCard label="Pending Tags" value={metrics.pending_tags} highlight />
        </section>

        <div className="admin-columns">
          <section className="admin-section">
            <h2>Pending Memories</h2>
            {data.pendingMemories?.length === 0 ? (
              <p className="empty-text">No pending memories 🎉</p>
            ) : (
              <div className="list-stack">
                {data.pendingMemories.map((memory) => (
                  <article key={memory.id} className="pending-card">
                    <h3>{memory.title}</h3>
                    <p className="pending-meta">
                      {memory.first_name} {memory.last_name} · {memory.department}
                    </p>
                    <p className="pending-snippet">{memory.content}</p>
                    <div className="card-actions">
                      <button type="button" onClick={() => handleMemoryDecision(memory.id, 'approved')}>
                        Approve
                      </button>
                      <button type="button" className="danger" onClick={() => handleMemoryDecision(memory.id, 'rejected')}>
                        Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-section">
            <h2>Pending Tag Requests</h2>
            {data.pendingTags?.length === 0 ? (
              <p className="empty-text">No tag requests.</p>
            ) : (
              <div className="list-stack">
                {data.pendingTags.map((tag) => (
                  <article key={tag.id} className="pending-card">
                    <h3>{tag.memory_title}</h3>
                    <p className="pending-meta">
                      Requested by {tag.requested_by_name} for {tag.tagged_student_name}
                    </p>
                    <div className="card-actions">
                      <button type="button" onClick={() => handleTagDecision(tag.id, 'approved')}>
                        Approve
                      </button>
                      <button type="button" className="danger" onClick={() => handleTagDecision(tag.id, 'declined')}>
                        Decline
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="admin-section">
          <h2>Recent Student Updates</h2>
          {data.recentStudentUpdates?.length === 0 ? (
            <p className="empty-text">No recent edits.</p>
          ) : (
            <table className="updates-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.recentStudentUpdates.map((student) => (
                  <tr key={student.student_id}>
                    <td>{student.first_name} {student.last_name}</td>
                    <td>{student.department}</td>
                    <td>{new Date(student.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, highlight }) => (
  <div className={`metric-card ${highlight ? 'metric-highlight' : ''}`}>
    <p className="metric-label">{label}</p>
    <p className="metric-value">{value ?? '-'}</p>
  </div>
);

export default AdminDashboard;
