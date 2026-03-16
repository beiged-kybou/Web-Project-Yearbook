import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentService } from '../services/api';
import './StudentDirectory.css';

const defaultPageSize = 24;

const StudentDirectory = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [batch, setBatch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [page, department, batch]);

  const fetchStudents = async () => {
    setError('');
    try {
      setLoading(true);
      const response = await studentService.list({
        search,
        department,
        batch,
        page,
        limit: defaultPageSize,
      });
      setStudents(response.students || []);
      setPagination(response.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.error || 'Failed to load student directory');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    setBatch('');
    setPage(1);
    fetchStudents();
  };

  const openStudentModal = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const departmentOptions = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      if (student.department) {
        map.set(student.department, student.departmentName || student.department);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [students]);

  const batchOptions = useMemo(() => {
    const set = new Set();
    students.forEach((student) => {
      if (student.graduationYear) {
        set.add(student.graduationYear);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [students]);

  return (
    <div className="directory-page">
      <section className="scrapbook-page directory-hero">
        <div className="corner-pin top-left"></div>
        <div className="corner-pin top-right"></div>
        <div className="corner-pin bottom-left"></div>
        <div className="corner-pin bottom-right"></div>

        <div className="hero-text">
          <p className="eyebrow">IUT Digital Yearbook</p>
          <h1>Student Directory</h1>
          <p className="hero-subtitle">Discover classmates across departments, find collaborators, and celebrate every batch.</p>
        </div>
        <div className="hero-actions">
          <Link className="hero-link" to="/dashboard">
            Back to Dashboard
          </Link>
          <button type="button" className="primary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </section>

      <section className="scrapbook-page directory-filters">
        <form onSubmit={handleSearchSubmit} className="filter-grid">
          <div className="form-group">
            <label htmlFor="searchInput">Search name or ID</label>
            <input
              id="searchInput"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="e.g. Sajid or 220041243"
            />
          </div>

          <div className="form-group">
            <label htmlFor="departmentSelect">Department</label>
            <select
              id="departmentSelect"
              value={department}
              onChange={(event) => {
                setDepartment(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All departments</option>
              {departmentOptions.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="batchSelect">Batch</label>
            <select
              id="batchSelect"
              value={batch}
              onChange={(event) => {
                setBatch(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All batches</option>
              {batchOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="primary search-btn">
            Apply Search
          </button>
        </form>
      </section>

      <section className="scrapbook-page directory-grid">
        <div className="corner-pin top-left"></div>
        <div className="corner-pin top-right"></div>
        <div className="corner-pin bottom-left"></div>
        <div className="corner-pin bottom-right"></div>

        {loading ? (
          <div className="directory-loading">
            <div className="spinner"></div>
            <p className="loading-text">Loading students...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <p>No students match these filters yet.</p>
          </div>
        ) : (
          <div className="student-grid">
            {students.map((student) => (
              <article key={student.studentId} className="student-card" onClick={() => openStudentModal(student)}>
                <div className="student-photo">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="" loading="lazy" />
                  ) : (
                    <span>{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</span>
                  )}
                </div>
                <div className="student-body">
                  <h3>{student.firstName} {student.lastName}</h3>
                  <p className="student-meta">{student.department} · Batch '{String(student.graduationYear).slice(-2)}</p>
                  {student.motto && <p className="student-motto">“{student.motto}”</p>}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="pagination-bar">
          <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
            Previous
          </button>
          <span>
            Page {page} of {Math.max(pagination.totalPages, 1)}
          </span>
          <button
            type="button"
            disabled={page >= (pagination.totalPages || 1)}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      </section>

      {isModalOpen && selectedStudent && (
        <div className="modal-backdrop" onClick={closeModal}>
          <section className="scrapbook-page directory-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Student Profile</p>
                <h3>{selectedStudent.firstName} {selectedStudent.lastName}</h3>
                <p className="student-meta">
                  {selectedStudent.department} · Batch '{String(selectedStudent.graduationYear).slice(-2)} · {selectedStudent.studentId}
                </p>
              </div>
              <button type="button" className="modal-close" onClick={closeModal}>
                Close
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-photo">
                {selectedStudent.photoUrl ? (
                  <img src={selectedStudent.photoUrl} alt="" />
                ) : (
                  <div className="placeholder-avatar">
                    {selectedStudent.firstName?.charAt(0)}{selectedStudent.lastName?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="modal-info">
                {selectedStudent.bio && (
                  <p className="student-bio">{selectedStudent.bio}</p>
                )}
                <ul className="info-list">
                  <li>
                    <span className="info-label">Email</span>
                    <span className="info-value">{selectedStudent.email}</span>
                  </li>
                  {selectedStudent.phone && (
                    <li>
                      <span className="info-label">Phone</span>
                      <span className="info-value">{selectedStudent.phone}</span>
                    </li>
                  )}
                  <li>
                    <span className="info-label">Department</span>
                    <span className="info-value">{selectedStudent.departmentName || selectedStudent.department}</span>
                  </li>
                  <li>
                    <span className="info-label">Graduation Year</span>
                    <span className="info-value">{selectedStudent.graduationYear}</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default StudentDirectory;
