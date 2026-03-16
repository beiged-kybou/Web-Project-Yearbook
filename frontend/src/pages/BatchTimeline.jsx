import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { batchService } from '../services/api';
import './BatchTimeline.css';

const palette = ['#8b2635', '#2d6a4f', '#d4af37', '#1d3557', '#6d597a', '#c8553d'];

const formatYearLabel = (label) => {
  if (!label) return 'Unknown Batch';
  if (label.startsWith("Batch '")) {
    return label;
  }
  return label.startsWith('Class of') ? label : `Class of ${label}`;
};

const highlightColors = (index) => {
  const color = palette[index % palette.length];
  return {
    bg: `${color}15`,
    border: color,
    text: color,
  };
};

const useBatchFilters = (batches, searchTerm, departmentFilter) => {
  return useMemo(() => {
    if (!Array.isArray(batches)) {
      return [];
    }

    const loweredSearch = searchTerm.trim().toLowerCase();
    const loweredDept = departmentFilter.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesSearch = loweredSearch
        ? batch.label?.toLowerCase().includes(loweredSearch) || String(batch.graduationYear).includes(loweredSearch)
        : true;

      const matchesDept = loweredDept
        ? (batch.topDepartments || []).some((dept) =>
            dept.code?.toLowerCase().includes(loweredDept) || dept.name?.toLowerCase().includes(loweredDept),
          )
        : true;

      return matchesSearch && matchesDept;
    });
  }, [batches, searchTerm, departmentFilter]);
};

const BatchTimeline = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [batchDetails, setBatchDetails] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await batchService.list();
      setBatches(response.batches || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.error || 'Failed to load batch timeline');
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = useBatchFilters(batches, searchTerm, departmentFilter);

  const uniqueDepartments = useMemo(() => {
    const map = new Map();
    batches.forEach((batch) => {
      (batch.topDepartments || []).forEach((dept) => {
        if (!map.has(dept.code)) {
          map.set(dept.code, dept.name || dept.code);
        }
      });
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [batches]);

  const openBatchDetails = async (batch) => {
    if (!batch) return;
    setSelectedBatch(batch);
    setIsModalOpen(true);
    setBatchDetails(null);
    setDetailLoading(true);
    setError('');

    try {
      const response = await batchService.get(batch.graduationYear);
      setBatchDetails(response);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load batch details');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBatch(null);
    setBatchDetails(null);
  };

  return (
    <div className="batch-page">
      <section className="scrapbook-page batch-hero">
        <div className="corner-pin top-left"></div>
        <div className="corner-pin top-right"></div>
        <div className="corner-pin bottom-left"></div>
        <div className="corner-pin bottom-right"></div>

        <div className="hero-text">
          <p className="eyebrow">IUT Digital Yearbook</p>
          <h1>Batch Timeline</h1>
          <p className="hero-subtitle">
            Journey through IUT’s history one graduating class at a time. Browse highlights, standout memories, and the people who made each year unforgettable.
          </p>
        </div>

        <div className="hero-actions">
          <Link className="hero-link" to="/dashboard">
            Back to Dashboard
          </Link>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setDepartmentFilter('');
              setSearchTerm('');
            }}
          >
            Reset Filters
          </button>
        </div>
      </section>

      <section className="scrapbook-page filter-panel">
        <h2>Find a Batch</h2>
        <div className="filter-grid">
          <div className="form-group">
            <label htmlFor="searchInput">Search batch year or label</label>
            <input
              id="searchInput"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="e.g. '25 or 2029"
            />
          </div>
          <div className="form-group">
            <label htmlFor="departmentFilter">Filter by department</label>
            <select
              id="departmentFilter"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value=''>All departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="scrapbook-page timeline-panel">
        <div className="corner-pin top-left"></div>
        <div className="corner-pin top-right"></div>
        <div className="corner-pin bottom-left"></div>
        <div className="corner-pin bottom-right"></div>

        {loading ? (
          <div className="timeline-loading">
            <div className="spinner"></div>
            <p className="loading-text">Gathering batches...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : filteredBatches.length === 0 ? (
          <div className="empty-state">
            <p>No batches match your filters. Try a different search.</p>
          </div>
        ) : (
          <div className="timeline-grid">
            {filteredBatches.map((batch, index) => {
              const colors = highlightColors(index);
              return (
                <article key={batch.graduationYear} className="timeline-card" style={{ borderColor: colors.border }}>
                  <div className="timeline-year">
                    <span className="year-entry">‘{String(batch.entryYear).slice(-2)}</span>
                    <span className="year-graduation">{batch.graduationYear}</span>
                  </div>

                  <h3>{formatYearLabel(batch.label)}</h3>

                  <div className="timeline-meta">
                    <span>{batch.studentCount} students</span>
                    <span>{batch.memoryCount} memories</span>
                  </div>

                  {batch.theme && <p className="timeline-theme">Yearbook Theme: {batch.theme}</p>}

                  {batch.topDepartments?.length > 0 && (
                    <div className="top-departments">
                      {batch.topDepartments.map((dept) => (
                        <div key={dept.code} className="dept-pill" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          <span className="dept-code">{dept.code}</span>
                          <span className="dept-metric">{dept.studentCount} ({dept.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {batch.highlight && (
                    <div className="highlight-card">
                      {batch.highlight.coverImage && (
                        <div className="highlight-image">
                          <img src={batch.highlight.coverImage} alt="" loading="lazy" />
                        </div>
                      )}
                      <div className="highlight-body">
                        <p className="highlight-label">Featured Memory</p>
                        <h4>{batch.highlight.title}</h4>
                        <p className="highlight-excerpt">{batch.highlight.excerpt}</p>
                        <span className="highlight-author">by {batch.highlight.authorName}</span>
                      </div>
                    </div>
                  )}

                  <button type="button" className="primary view-btn" onClick={() => openBatchDetails(batch)}>
                    Explore Batch
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isModalOpen && selectedBatch && (
        <div className="modal-backdrop" onClick={closeModal}>
          <section className="scrapbook-page batch-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Batch {selectedBatch.graduationYear}</p>
                <h3>{formatYearLabel(selectedBatch.label)}</h3>
              </div>
              <button type="button" className="modal-close" onClick={closeModal}>
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="timeline-loading">
                <div className="spinner"></div>
                <p className="loading-text">Loading memories...</p>
              </div>
            ) : batchDetails ? (
              <BatchDetailView details={batchDetails} />
            ) : (
              <p className="empty-text">No data available for this batch yet.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

const BatchDetailView = ({ details }) => {
  const { batch, stats, highlightMemory, studentSpotlight, memorySpotlight, albums } = details;

  return (
    <div className="batch-detail">
      <section className="detail-section">
        <h4>Batch Overview</h4>
        <div className="detail-grid">
          <DetailMetric label="Graduation Year" value={batch.graduationYear} />
          <DetailMetric label="Entry Year" value={batch.entryYear} />
          <DetailMetric label="Students" value={stats.studentCount} />
          <DetailMetric label="Memories" value={stats.memoryCount} />
          <DetailMetric label="Theme" value={batch.theme || 'TBD'} />
        </div>
        {stats.topDepartments?.length > 0 && (
          <div className="detail-block">
            <h5>Top Departments</h5>
            <div className="dept-grid">
              {stats.topDepartments.map((dept) => (
                <div key={dept.code} className="dept-card">
                  <strong>{dept.code}</strong>
                  <span>{dept.name}</span>
                  <span className="dept-stats">
                    {dept.studentCount} students · {dept.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {highlightMemory && (
        <section className="detail-section">
          <h4>Headline Memory</h4>
          <MemorySpotlight memory={highlightMemory} />
        </section>
      )}

      {studentSpotlight?.length > 0 && (
        <section className="detail-section">
          <h4>Student Spotlights</h4>
          <div className="student-grid">
            {studentSpotlight.map((student) => (
              <article key={student.studentId} className="student-card">
                <div className="student-avatar">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="" loading="lazy" />
                  ) : (
                    <span>{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</span>
                  )}
                </div>
                <h5>{student.firstName} {student.lastName}</h5>
                <p className="student-meta">{student.department}</p>
                {student.motto && <blockquote>{student.motto}</blockquote>}
              </article>
            ))}
          </div>
        </section>
      )}

      {memorySpotlight?.length > 0 && (
        <section className="detail-section">
          <h4>Recent Memories</h4>
          <div className="memory-grid">
            {memorySpotlight.map((memory) => (
              <MemorySpotlight key={memory.id} memory={memory} />
            ))}
          </div>
        </section>
      )}

      {albums?.length > 0 && (
        <section className="detail-section">
          <h4>Curated Albums</h4>
          <div className="album-grid">
            {albums.map((album) => (
              <article key={album.id} className="album-card-mini">
                <h5>{album.title}</h5>
                <p>{album.description || 'No description yet.'}</p>
                <span className="album-meta">by {album.createdByName}</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const DetailMetric = ({ label, value }) => (
  <div className="detail-metric">
    <p className="metric-label">{label}</p>
    <p className="metric-value">{value ?? '—'}</p>
  </div>
);

const MemorySpotlight = ({ memory }) => (
  <article className="memory-spotlight">
    <div className="memory-spotlight-body">
      <h5>{memory.title}</h5>
      <p>{memory.excerpt}</p>
      <span className="memory-author">by {memory.authorName}</span>
    </div>
    {memory.coverImage && (
      <div className="memory-spotlight-image">
        <img src={memory.coverImage} alt="" loading="lazy" />
      </div>
    )}
  </article>
);

export default BatchTimeline;
