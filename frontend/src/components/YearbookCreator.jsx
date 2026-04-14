import { useState, useEffect } from "react";
import { yearbookService, clubService } from "../services/api";
import "../pages/Dashboard.css"; // Correct path to Dashboard.css from components directory

const YearbookCreator = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Setup, 2: Preview & Edit
  const [loading, setLoading] = useState(false);
  const [previewMemories, setPreviewMemories] = useState([]);
  const [removedMemoryIds, setRemovedMemoryIds] = useState(new Set());
  const [clubs, setClubs] = useState([]);

  const [form, setForm] = useState({
    title: "",
    privacy: "public",
    clubCode: "",
    startDate: "",
    endDate: "",
    coverFile: null,
  });

  useEffect(() => {
    const fetchClubs = async () => {
      const result = await clubService.myClubs();
      setClubs(result.clubs || []);
    };
    fetchClubs();
  }, []);

  const handlePreview = async () => {
    if (
      form.startDate &&
      form.endDate &&
      new Date(form.startDate) > new Date(form.endDate)
    ) {
      alert("End date cannot be earlier than start date.");
      return;
    }
    setLoading(true);
    try {
      const result = await yearbookService.previewPersonalYearbook({
        privacy: form.privacy,
        clubCode: form.clubCode,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      setPreviewMemories(result.memories || []);
      setRemovedMemoryIds(new Set());
      setStep(2);
    } catch (err) {
      alert(
        "Failed to fetch memories: " +
          (err.response?.data?.error || err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const activeMemories = previewMemories.filter(
        (m) => !removedMemoryIds.has(m.id),
      );
      console.log("Active Memories for creation:", JSON.stringify(activeMemories));
      if (!activeMemories || activeMemories.length === 0) {
        alert("At least one memory is required. Current count: " + (activeMemories ? activeMemories.length : 0));
        return;
      }

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("privacy", form.privacy);
      if (form.clubCode) formData.append("clubCode", form.clubCode);
      if (form.startDate) formData.append("startDate", form.startDate);
      if (form.endDate) formData.append("endDate", form.endDate);
      if (form.coverFile) formData.append("cover", form.coverFile);

      formData.append(
        "memoryIds",
        JSON.stringify(activeMemories.map((m) => m.id)),
      );

      const result = await yearbookService.createPersonalYearbook(formData);
      onSuccess(result.releaseId);
    } catch (err) {
      alert(
        "Failed to create yearbook: " +
          (err.response?.data?.error || err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="scrapbook-page modal-composer profile-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px" }}
      >
        <div className="modal-header">
          <h3 className="composer-title">Create Yearbook</h3>
          <button className="modal-close" onClick={onClose}>
            Close
          </button>
        </div>

        {step === 1 && (
          <div className="composer-form">
            <div className="form-group">
              <label>Yearbook Title</label>
              <input
                type="text"
                placeholder="My Semester Scrapbook"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Privacy Scope</label>
              <select
                value={form.privacy}
                onChange={(e) =>
                  setForm({ ...form, privacy: e.target.value, clubCode: "" })
                }
              >
                <option value="public">Public Feed</option>
                <option value="department">My Department</option>
                <option value="batch">My Batch</option>
                <option value="club">A Specific Club</option>
              </select>
            </div>

            {form.privacy === "club" && (
              <div className="form-group">
                <label>Select Club</label>
                <select
                  value={form.clubCode}
                  onChange={(e) =>
                    setForm({ ...form, clubCode: e.target.value })
                  }
                >
                  <option value="">Choose a club</option>
                  {clubs.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="composer-field-row">
              <div className="field-column">
                <label>Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <div className="field-column">
                <label>End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                  style={{ textTransform: "uppercase" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Cover Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setForm({ ...form, coverFile: e.target.files[0] })
                }
              />
            </div>

            <div className="composer-actions">
              <button className="ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                className="primary"
                onClick={handlePreview}
                disabled={!form.title || loading}
              >
                {loading ? "Scanning..." : "Preview Memories"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="composer-form">
            <p className="composer-hint">
              Found {previewMemories.length} memories. Remove any you don't want
              in your yearbook.
            </p>

            <div
              className="memories-preview-list"
              style={{
                maxHeight: "400px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div
                className="memory-card"
                style={{
                  border: "1px dashed var(--tui-col-accent)",
                  opacity: 0.8,
                }}
              >
                <h4 className="memory-title">COVER PAGE</h4>
                <p className="memory-text">{form.title}</p>
                {form.coverFile && (
                  <p className="composer-hint">
                    Image selected: {form.coverFile.name}
                  </p>
                )}
              </div>

              {previewMemories.map((m) => (
                <div
                  key={m.id}
                  className={`memory-card ${removedMemoryIds.has(m.id) ? "memory-card--removed" : ""}`}
                  style={{ opacity: removedMemoryIds.has(m.id) ? 0.4 : 1 }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <h4 className="memory-title">
                      {m.title || "Untitled Memory"}
                    </h4>
                    <button
                      className="tray-card__remove"
                      onClick={() => {
                        const next = new Set(removedMemoryIds);
                        if (next.has(m.id)) next.delete(m.id);
                        else next.add(m.id);
                        setRemovedMemoryIds(next);
                      }}
                    >
                      {removedMemoryIds.has(m.id) ? "Undo" : "Remove"}
                    </button>
                  </div>
                  <p className="memory-text" style={{ fontSize: "0.8rem" }}>
                    {m.content?.slice(0, 100)}...
                  </p>
                </div>
              ))}
            </div>

            <div className="composer-actions" style={{ marginTop: "1rem" }}>
              <button className="ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="primary"
                onClick={handleCreate}
                disabled={
                  loading ||
                  previewMemories.length - removedMemoryIds.size === 0
                }
              >
                {loading ? "Creating..." : "Create Flipbook"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YearbookCreator;
