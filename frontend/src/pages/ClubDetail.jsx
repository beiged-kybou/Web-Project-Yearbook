import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { clubService, memoryService, studentService, dashboardService } from "../services/api";
import ImageTray from "../components/ImageTray";
import "./Dashboard.css"; // Reuse dashboard styles for consistency

const MAX_UPLOAD_FILES = 10;
const URL_LABEL_LIMIT = 36;
const FILE_SIZE_LIMIT_MB = 25;
const FILE_SIZE_LIMIT_BYTES = FILE_SIZE_LIMIT_MB * 1024 * 1024;
const DEFAULT_UPLOAD_MESSAGE =
  "Stage up to 10 photos. Drag to reorder; the first becomes the cover.";

const getQueueId = (prefix) => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isValidImageUrl = (value = "") => /^https?:\/\//i.test(value.trim());

const truncateLabel = (value = "", limit = URL_LABEL_LIMIT) => {
  if (!value) return "";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 3)}...`;
};

const buildImageLayoutFromQueue = (queue = []) =>
  queue.map((item, index) => ({
    type: item.source === "file" ? "file" : item.source,
    ref:
      item.source === "existing"
        ? item.id
        : item.source === "url"
          ? item.url
          : item.queueId,
    index,
  }));

const ClubDetail = () => {
  const { clubCode } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Post Composer State
  const [showPostModal, setShowPostModal] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState("");
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [imageUrlsInput, setImageUrlsInput] = useState("");
  const [imageQueue, setImageQueue] = useState([]);
  const [imageLayout, setImageLayout] = useState([]);
  const [uploadMessage, setUploadMessage] = useState(DEFAULT_UPLOAD_MESSAGE);
  const [uploadWarning, setUploadWarning] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedTagStudents, setSelectedTagStudents] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [tagSearchLoading, setTagSearchLoading] = useState(false);
  const [viewer, setViewer] = useState(null);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clubsResult, memoriesResult, profileResult] = await Promise.all([
        clubService.listClubs(),
        clubService.getClubMemories(clubCode),
        studentService.getMyProfile().catch(() => null)
      ]);

      const foundClub = (clubsResult.clubs || []).find(c => c.code === clubCode);
      if (!foundClub) {
        setError("Club not found.");
        return;
      }
      setClub(foundClub);
      setMemories(memoriesResult.memories || []);
      if (profileResult) {
        setViewer(profileResult.profile);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load club details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clubCode]);

  const handleTagSearchChange = async (value) => {
    setTagSearch(value);
    const query = value.trim();
    if (query.length < 2) {
      setTagSuggestions([]);
      return;
    }

    try {
      setTagSearchLoading(true);
      const result = await studentService.searchStudents(query);
      const alreadySelected = new Set(selectedTagStudents.map(s => s.studentId));
      const currentStudentId = viewer?.studentId || "";

      const filtered = (result.students || [])
        .filter(s => String(s.studentId) !== String(currentStudentId))
        .filter(s => !alreadySelected.has(s.studentId))
        .slice(0, 8);

      setTagSuggestions(filtered);
    } catch {
      setTagSuggestions([]);
    } finally {
      setTagSearchLoading(false);
    }
  };

  const addTagStudent = (student) => {
    setSelectedTagStudents((prev) => [...prev, student]);
    setTagSearch("");
    setTagSuggestions([]);
  };

  const removeTagStudent = (studentId) => {
    setSelectedTagStudents((prev) =>
      prev.filter((student) => student.studentId !== studentId),
    );
  };

  const handlePublishMemory = async (e) => {
    e.preventDefault();
    setPostError("");
    setPostSuccess("");

    if (!headline.trim()) {
      setPostError("Headline is required.");
      return;
    }
    if (!caption.trim()) {
      setPostError("Caption is required.");
      return;
    }

    try {
      setPostLoading(true);
      const taggedStudentIds = selectedTagStudents.map(s => s.studentId);
      const imageUrls = imageQueue.filter(i => i.source === "url").map(i => i.url);
      const files = imageQueue.filter(i => i.source === "file").map(i => i.file);

      await memoryService.createMemory({
        headline: headline.trim(),
        caption: caption.trim(),
        privacy: "club",
        clubCode: clubCode,
        imageUrls,
        files,
        taggedStudentIds,
        imageLayout
      });

      setPostSuccess("Memory shared with the club!");
      setHeadline("");
      setCaption("");
      setImageQueue([]);
      setSelectedTagStudents([]);
      setTimeout(() => {
        setShowPostModal(false);
        setPostSuccess("");
        fetchData();
      }, 1500);
    } catch (err) {
      setPostError(err.response?.data?.error || "Failed to post memory.");
    } finally {
      setPostLoading(false);
    }
  };

  const computeUploadMessage = (count) =>
    count >= 8
      ? "Almost full—double-check your order before posting."
      : DEFAULT_UPLOAD_MESSAGE;

  const revokePreview = (item) => {
    if (item?.source === "file" && item.preview) {
      URL.revokeObjectURL(item.preview);
    }
  };

  const reorderQueue = (list, draggedId, targetId, position = "before") => {
    if (draggedId === targetId || !draggedId) return list;
    const draggedIndex = list.findIndex((item) => item.queueId === draggedId);
    const targetIndex = list.findIndex((item) => item.queueId === targetId);
    if (draggedIndex === -1) return list;
    const next = [...list];
    const [draggedItem] = next.splice(draggedIndex, 1);
    if (targetIndex === -1) {
      next.push(draggedItem);
      return next;
    }
    const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
    next.splice(insertIndex, 0, draggedItem);
    return next;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
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
            <button className="post-btn" onClick={() => setShowPostModal(true)} style={{ marginRight: '1rem' }}>
              POST
            </button>
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

      {showPostModal && (
        <div className="modal-backdrop" onClick={() => setShowPostModal(false)}>
          <section
            className="scrapbook-page post-composer modal-composer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="composer-title">Publish to {club?.name}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowPostModal(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={handlePublishMemory} className="composer-form">
              <div className="form-group">
                <label htmlFor="headline">Headline</label>
                <input
                  id="headline"
                  type="text"
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder="Write a short headline"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="caption">Caption</label>
                <textarea
                  id="caption"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Write your memory caption"
                  rows={4}
                  required
                />
              </div>

              <div className="form-group">
                <div className="composer-field-row">
                  <div className="field-column">
                    <label htmlFor="localImages">Upload from device</label>
                    <input
                      id="localImages"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        if (files.length === 0) return;
                        
                        const currentCount = imageQueue.length;
                        const availableSlots = Math.max(MAX_UPLOAD_FILES - currentCount, 0);
                        
                        if (availableSlots === 0) {
                          setUploadWarning("Image tray is full.");
                          event.target.value = "";
                          return;
                        }

                        const trimmed = files
                          .filter(file => file.size <= FILE_SIZE_LIMIT_BYTES)
                          .slice(0, availableSlots);
                        
                        const staged = trimmed.map((file, index) => ({
                          queueId: getQueueId("file"),
                          source: "file",
                          file,
                          name: file.name,
                          size: file.size,
                          preview: URL.createObjectURL(file),
                          order: currentCount + index,
                        }));

                        setImageQueue((prev) => {
                          const next = [...prev, ...staged];
                          setImageLayout(buildImageLayoutFromQueue(next));
                          setUploadMessage(computeUploadMessage(next.length));
                          return next;
                        });
                      }}
                    />
                    <small className="composer-hint">{uploadMessage}</small>
                  </div>
                  <div className="field-column">
                    <label htmlFor="imageUrlInput">Add image link</label>
                    <div className="url-inline-field">
                      <input
                        id="imageUrlInput"
                        type="url"
                        placeholder="https://example.com/photo.jpg"
                        value={imageUrlsInput}
                        onChange={(event) => setImageUrlsInput(event.target.value)}
                      />
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          const trimmed = imageUrlsInput.trim();
                          if (!isValidImageUrl(trimmed)) return;
                          
                          const queueId = getQueueId("url");
                          setImageQueue((prev) => {
                            const next = [
                              ...prev,
                              {
                                queueId,
                                source: "url",
                                url: trimmed,
                                label: truncateLabel(trimmed),
                                order: prev.length,
                              },
                            ];
                            setImageLayout(buildImageLayoutFromQueue(next));
                            setUploadMessage(computeUploadMessage(next.length));
                            return next;
                          });
                          setImageUrlsInput("");
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <ImageTray
                  images={imageQueue}
                  maxSlots={MAX_UPLOAD_FILES}
                  onDragReorder={(sourceId, targetId, position) => {
                    setImageQueue((prev) => {
                      const next = reorderQueue(prev, sourceId, targetId, position);
                      setImageLayout(buildImageLayoutFromQueue(next));
                      return next;
                    });
                  }}
                  onRemove={(queueId) => {
                    setImageQueue((prev) => {
                      const target = prev.find(i => i.queueId === queueId);
                      if (target) revokePreview(target);
                      const next = prev.filter(i => i.queueId !== queueId);
                      setImageLayout(buildImageLayoutFromQueue(next));
                      return next;
                    });
                  }}
                  onOrderChange={(nextQueue) => {
                    setImageQueue(nextQueue);
                    setImageLayout(buildImageLayoutFromQueue(nextQueue));
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tag students</label>
                {selectedTagStudents.length > 0 && (
                  <div className="selected-tags">
                    {selectedTagStudents.map((student) => (
                      <button
                        type="button"
                        key={student.studentId}
                        className="selected-tag-chip"
                        onClick={() => removeTagStudent(student.studentId)}
                      >
                        {student.firstName} {student.lastName} ({student.studentId})
                        <span className="chip-remove">x</span>
                      </button>
                    ))}
                  </div>
                )}
                <input
                  id="tags"
                  type="text"
                  value={tagSearch}
                  onChange={(e) => handleTagSearchChange(e.target.value)}
                  placeholder="Search students..."
                />
                {tagSuggestions.length > 0 && (
                  <div className="tag-suggestions">
                    {tagSuggestions.map((student) => (
                      <button
                        type="button"
                        key={student.studentId}
                        className="tag-suggestion-item"
                        onClick={() => addTagStudent(student)}
                      >
                        {student.firstName} {student.lastName} ({student.studentId})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {postError && <div className="error-message">{postError}</div>}
              {postSuccess && <div className="success-message">{postSuccess}</div>}

              <div className="composer-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowPostModal(false)}
                  disabled={postLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={postLoading}>
                  {postLoading ? "Publishing..." : "Publish to Club"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default ClubDetail;
