import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, roleService, yearbookService } from '../services/api';
import useIsRootAdmin, { isRootAdminEmail } from '../hooks/useIsRootAdmin';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [accessList, setAccessList] = useState([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [roleUpdating, setRoleUpdating] = useState('');
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [releases, setReleases] = useState([]);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseError, setReleaseError] = useState('');
  const [releaseForm, setReleaseForm] = useState({ title: '', year: new Date().getFullYear(), theme: '', introText: '', coverPhotoUrl: '' });
  const [coverFile, setCoverFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState({ type: '', payload: null });
  const rootAdmin = useIsRootAdmin();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadDashboard();
    loadAccessList();
    loadReleases();
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

  const handleRoleChange = async (memberId, nextRole) => {
    try {
      setRoleUpdating(memberId);
      await roleService.updateRole(memberId, nextRole);
      setActionMessage('Role updated');
      await loadAccessList();
    } catch (err) {
      setAccessError(err.response?.data?.error || 'Failed to update role');
    } finally {
      setRoleUpdating('');
    }
  };

  const handleRevoke = (memberId) => {
    setConfirmAction({ type: 'revokeAccess', payload: memberId });
  };

  const loadAccessList = async () => {
    try {
      setAccessError('');
      setAccessLoading(true);
      const response = await roleService.listAccess();
      setAccessList(response.users || []);
    } catch (err) {
      setAccessError(err.response?.data?.error || 'Failed to load access list');
    } finally {
      setAccessLoading(false);
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
            {rootAdmin && (
              <button type="button" onClick={() => setShowAccessModal(true)}>
                Manage Access
              </button>
            )}
            <button type="button" className="primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </header>

        {actionMessage && <div className="success-message">{actionMessage}</div>}
        {error && <div className="error-message">{error}</div>}
        {confirmAction.type === 'publish' && (
          <div className="confirm-banner">
            <p>
              Publishing locks the release and exposes the flipbook publicly. Continue?
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setConfirmAction({ type: '', payload: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={async () => {
                  try {
                    setActionMessage('');
                    await yearbookService.updateReleaseStatus(confirmAction.payload, 'published');
                    setActionMessage('Release published');
                    setConfirmAction({ type: '', payload: null });
                    await loadReleases();
                  } catch (err) {
                    setReleaseError(err.response?.data?.error || 'Failed to publish release');
                  }
                }}
              >
                Confirm Publish
              </button>
            </div>
          </div>
        )}

        <section className="admin-section">
          <div className="section-header">
            <div>
              <h2>Yearbook Releases</h2>
              <p className="eyebrow">Only root admins can launch, schedule, and publish yearly editions.</p>
            </div>
            <div className="section-actions">
              <button type="button" onClick={loadReleases} disabled={releaseLoading}>
                Refresh
              </button>
              {rootAdmin && !showReleaseForm && (
                <button type="button" className="primary" onClick={() => setShowReleaseForm(true)}>
                  New Release
                </button>
              )}
            </div>
          </div>

          {releaseError && <p className="error-message">{releaseError}</p>}

          <div className="yearbook-releases">
            {showReleaseForm && (
              <form className="release-form" onSubmit={handleCreateRelease}>
                <h3>Create Release</h3>
                <label>
                  Title
                <input
                  type="text"
                  value={releaseForm.title}
                  onChange={(event) => setReleaseForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                  disabled={formLoading}
                />
              </label>
              <label>
                Year
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={releaseForm.year}
                  onChange={(event) => setReleaseForm((prev) => ({ ...prev, year: event.target.value }))}
                  required
                  disabled={formLoading}
                />
              </label>
              <label>
                Theme
                <input
                  type="text"
                  value={releaseForm.theme}
                  onChange={(event) => setReleaseForm((prev) => ({ ...prev, theme: event.target.value }))}
                  disabled={formLoading}
                />
              </label>
              <label>
                Intro Text
                <textarea
                  rows="3"
                  value={releaseForm.introText}
                  onChange={(event) => setReleaseForm((prev) => ({ ...prev, introText: event.target.value }))}
                  disabled={formLoading}
                />
              </label>
              <label>
                Cover Photo URL
                <input
                  type="url"
                  value={releaseForm.coverPhotoUrl}
                  onChange={(event) => setReleaseForm((prev) => ({ ...prev, coverPhotoUrl: event.target.value }))}
                  disabled={formLoading}
                />
              </label>
              <label>
                Or Upload Cover
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
                  disabled={formLoading}
                />
              </label>
              {formError && <p className="error-message">{formError}</p>}
              <button type="submit" className="primary" disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create Release'}
              </button>
              <button type="button" className="ghost" onClick={() => setShowReleaseForm(false)} disabled={formLoading}>
                Cancel
              </button>
            </form>
            )}

            <div className="release-table-wrapper">
              {releaseLoading ? (
                <div className="spinner" />
              ) : releases.length === 0 ? (
                <p className="empty-text">No releases yet. Kick off the first edition!</p>
              ) : (
                <table className="release-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {releases.map((release) => (
                      <tr key={release.id}>
                        <td>{release.year}</td>
                        <td>
                          <p className="release-title">{release.title}</p>
                          <p className="release-subtext">{release.theme || 'No theme yet'}</p>
                        </td>
                        <td>
                          <span className={`status-pill status-${release.status}`}>
                            {release.status}
                          </span>
                        </td>
                        <td>{new Date(release.updated_at || release.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="release-actions">
                            <select
                              value={release.status}
                              onChange={(event) => handleStatusChange(release.id, event.target.value)}
                            >
                              <option value="draft">Draft</option>
                              <option value="collecting">Collecting</option>
                              <option value="final">Final QA</option>
                              <option value="published">Published</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/yearbooks/${release.id}`)}
                            >
                              Manage Pages
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        <section className="metrics-grid">
          {loading ? (
            <div className="spinner" />
          ) : (
            <>
              <MetricCard label="Total Users" value={metrics.total_users} />
              <MetricCard label="Total Students" value={metrics.total_students} />
              <MetricCard label="Memories" value={metrics.total_memories} />
              <MetricCard label="Memories (7d)" value={metrics.memories_this_week} />
              <MetricCard label="Pending Memories" value={metrics.pending_memories} highlight />
              <MetricCard label="Pending Tags" value={metrics.pending_tags} highlight />
            </>
          )}
        </section>

        <div className="admin-columns">
          <section className="admin-section">
            <h2>Pending Memories</h2>
            {loading ? (
              <div className="spinner" />
            ) : data.pendingMemories?.length === 0 ? (
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
            {loading ? (
              <div className="spinner" />
            ) : data.pendingTags?.length === 0 ? (
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
          {loading ? (
            <div className="spinner" />
          ) : data.recentStudentUpdates?.length === 0 ? (
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

        {confirmAction.type === 'revokeAccess' && (
          <div className="confirm-banner">
            <p>Revoke admin access for this member?</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setConfirmAction({ type: '', payload: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={async () => {
                  try {
                    const memberId = confirmAction.payload;
                    setRoleUpdating(memberId);
                    await roleService.revokeAccess(memberId);
                    setActionMessage('Access revoked');
                    setConfirmAction({ type: '', payload: null });
                    await loadAccessList();
                  } catch (err) {
                    setAccessError(err.response?.data?.error || 'Failed to revoke access');
                  } finally {
                    setRoleUpdating('');
                  }
                }}
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        )}

        {showAccessModal && (
          <div className="modal-backdrop" onClick={() => setShowAccessModal(false)}>
            <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
              <header className="modal-header">
                <h2>Roles & Access</h2>
                <button type="button" className="ghost" onClick={() => setShowAccessModal(false)}>
                  Close
                </button>
              </header>

              {accessLoading ? (
                <div className="modal-body">
                  <div className="spinner" />
                  <p className="loading-text">Loading access list…</p>
                </div>
              ) : accessError ? (
                <div className="modal-body">
                  <div className="error-message">{accessError}</div>
                </div>
              ) : (
                <div className="modal-body access-list">
                  {accessList.map((member) => {
                    const email = member.email || '';
                    const isProtected = isRootAdminEmail(email);
                    return (
                      <div key={member.id} className="access-row">
                        <div>
                          <p className="access-name">{member.display_name || '—'}</p>
                          <p className="access-email">{email}</p>
                          {isProtected && <p className="access-badge">Root Admin</p>}
                        </div>
                        <div className="access-actions">
                          <select
                            value={member.role}
                            disabled={!rootAdmin && isProtected}
                            onChange={(event) => handleRoleChange(member.id, event.target.value)}
                          >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            type="button"
                            className="danger"
                            disabled={isProtected || roleUpdating === member.id}
                onClick={() => handleRevoke(member.id)}
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
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
  const loadReleases = async () => {
    try {
      setReleaseError('');
      setReleaseLoading(true);
      const response = await yearbookService.listReleases();
      setReleases(response.releases || []);
    } catch (err) {
      setReleaseError(err.response?.data?.error || 'Failed to load releases');
    } finally {
      setReleaseLoading(false);
    }
  };

  const handleCreateRelease = async (event) => {
    event.preventDefault();
    setFormError('');
    try {
      setFormLoading(true);
      await yearbookService.createRelease({ ...releaseForm, coverFile });
      setActionMessage('Release created');
      setReleaseForm((prev) => ({ ...prev, title: '', theme: '', introText: '', coverPhotoUrl: '' }));
      setCoverFile(null);
      await loadReleases();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create release');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (releaseId, status) => {
    if (status === 'published') {
      setConfirmAction({ type: 'publish', payload: releaseId });
      return;
    }
    try {
      setActionMessage('');
      await yearbookService.updateReleaseStatus(releaseId, status);
      setActionMessage('Release updated');
      await loadReleases();
    } catch (err) {
      setReleaseError(err.response?.data?.error || 'Failed to update release');
    }
  };
