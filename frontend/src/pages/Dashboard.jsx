import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  activityNotificationService,
  clubService,
  dashboardService,
  memoryService,
  studentService,
  tagNotificationService,
} from "../services/api";
import ActivityNotificationCard from "../components/ActivityNotificationCard";
import ImageTray from "../components/ImageTray";
import "./Dashboard.css";

const MAX_UPLOAD_FILES = 10;
const URL_LABEL_LIMIT = 36;
const FILE_SIZE_LIMIT_MB = 25;
const FILE_SIZE_LIMIT_BYTES = FILE_SIZE_LIMIT_MB * 1024 * 1024;
const DEFAULT_UPLOAD_MESSAGE =
  "Stage up to 10 photos. Drag to reorder; the first becomes the cover.";
const IMAGE_SOURCE_LABELS = {
  existing: "Draft",
  file: "Upload",
  url: "Link",
};
const IMAGE_WARNING_LIMIT = 8;
const computeUploadMessage = (count) =>
  count >= IMAGE_WARNING_LIMIT
    ? "Almost full—double-check your order before posting."
    : DEFAULT_UPLOAD_MESSAGE;

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

const bytesToSize = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const getSourceLabel = (source) => IMAGE_SOURCE_LABELS[source] || "Image";
const readableSize = (item) => {
  if (item.source !== "file") {
    return null;
  }
  if (item.size) {
    return bytesToSize(item.size);
  }
  if (item.file?.size) {
    return bytesToSize(item.file.size);
  }
  return null;
};

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("department");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [imageUrlsInput, setImageUrlsInput] = useState("");
  const fileInputRef = useRef(null);
  const [imageQueue, setImageQueue] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState(new Set());
  const [imageLayout, setImageLayout] = useState([]);
  const [uploadMessage, setUploadMessage] = useState(DEFAULT_UPLOAD_MESSAGE);
  const [uploadWarning, setUploadWarning] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedTagStudents, setSelectedTagStudents] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [tagSearchLoading, setTagSearchLoading] = useState(false);
  const [postPrivacy, setPostPrivacy] = useState("public");
  const [selectedClubCode, setSelectedClubCode] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [myClubCodes, setMyClubCodes] = useState(new Set());
  const [clubLoading, setClubLoading] = useState(true);
  const [clubError, setClubError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileForm, setProfileForm] = useState({
    displayPhoto: "",
    motto: "",
    bio: "",
  });
  const [selectedProfileFile, setSelectedProfileFile] = useState(null);
  const [myMemories, setMyMemories] = useState({
    department: [],
    batch: [],
    public: [],
    drafts: [],
  });
  const [isDraft, setIsDraft] = useState(false);
  const [liveValidation, setLiveValidation] = useState({
    headline: "",
    caption: "",
  });
  const [drafts, setDrafts] = useState([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [editingDraft, setEditingDraft] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchDashboard();
    fetchClubs();
    fetchDrafts();
  }, []);

  const fetchDashboard = async () => {
    try {
      const result = await dashboardService.getDashboard();
      setData(result);
      await fetchNotifications();
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      setError(err.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const openProfileModal = async () => {
    setProfileError("");
    setProfileSuccess("");
    setShowProfileModal(true);
    setProfileLoading(true);

    try {
      const result = await studentService.getMyProfile();
      setProfileForm({
        displayPhoto: result.profile?.displayPhoto || "",
        motto: result.profile?.motto || "",
        bio: result.profile?.bio || "",
      });
      setSelectedProfileFile(null);
      setMyMemories(
        result.memories || {
          department: [],
          batch: [],
          public: [],
          drafts: [],
        },
      );
      await fetchDrafts();
    } catch (err) {
      setProfileError(err.response?.data?.error || "Failed to load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    try {
      setProfileSaving(true);
      const result = await studentService.updateMyProfile({
        ...profileForm,
        displayPhotoFile: selectedProfileFile,
      });
      setProfileForm({
        displayPhoto: result.profile?.displayPhoto || "",
        motto: result.profile?.motto || "",
        bio: result.profile?.bio || "",
      });
      setSelectedProfileFile(null);
      setMyMemories(
        result.memories || {
          department: [],
          batch: [],
          public: [],
          drafts: [],
        },
      );
      setProfileSuccess("Profile updated successfully.");
      await fetchDashboard();
      await fetchDrafts();
    } catch (err) {
      setProfileError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const isStudentAllowedForPrivacy = (student) => {
    if (!data?.user) return true;

    if (postPrivacy === "public") return true;
    if (postPrivacy === "department") {
      return student.department === data.user.department;
    }
    if (postPrivacy === "batch") {
      return (
        Number(student.graduation_year) === Number(data.user.graduationYear)
      );
    }
    return true;
  };

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

      const alreadySelected = new Set(
        selectedTagStudents.map((student) => student.student_id),
      );
      const currentStudentId = data?.user?.studentId || "";
      const filtered = (result.students || [])
        .filter(
          (student) => String(student.student_id) !== String(currentStudentId),
        )
        .filter((student) => !alreadySelected.has(student.student_id))
        .filter((student) => isStudentAllowedForPrivacy(student))
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

  const fetchDrafts = async () => {
    try {
      setDraftError("");
      setDraftLoading(true);
      const response = await memoryService.listDrafts();
      setDrafts(response.drafts || []);
    } catch (err) {
      setDraftError(err.response?.data?.error || "Failed to load drafts.");
    } finally {
      setDraftLoading(false);
    }
  };

  const startEditingDraft = (draft) => {
    if (!draft) return;
    setEditingDraft(draft);
    setHeadline(draft.title || "");
    setCaption(draft.content || "");
    setPostPrivacy(mapAlbumTypeToPrivacy(draft.album_type));
    setIsDraft(true);
    setShowPostModal(true);
    setPostError("");
    setPostSuccess("");
    setLiveValidation({ headline: "", caption: "" });
    setTagSearch("");
    setSelectedTagStudents([]);
    setTagSuggestions([]);
    setSelectedClubCode("");
    const draftImages = (draft.images || []).map((image, index) => ({
      id: image.id,
      url: image.url,
      name: image.label || image.url,
      label: truncateLabel(image.label || image.url),
      source: "existing",
      queueId: String(image.id),
      order: index,
    }));
    setImageQueue(draftImages);
    setRemovedImageIds(new Set());
    setImageLayout(buildImageLayoutFromQueue(draftImages));
    setUploadMessage(DEFAULT_UPLOAD_MESSAGE);
    setUploadWarning("");
    setImageUrlsInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearComposer = () => {
    setHeadline("");
    setCaption("");
    setImageUrlsInput("");
    imageQueue.forEach(revokePreview);
    setImageQueue([]);
    setRemovedImageIds(new Set());
    setImageLayout([]);
    setUploadMessage(DEFAULT_UPLOAD_MESSAGE);
    setUploadWarning("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setTagSearch("");
    setSelectedTagStudents([]);
    setTagSuggestions([]);
    setSelectedClubCode("");
    setIsDraft(false);
    setLiveValidation({ headline: "", caption: "" });
    setEditingDraft(null);
  };

  const mapAlbumTypeToPrivacy = (type) => {
    if (type === "department") return "department";
    if (type === "batch") return "batch";
    if (type === "club") return "club";
    return "public";
  };

  const validateField = (field, value) => {
    setLiveValidation((prev) => {
      const next = { ...prev };
      if (field === "headline") {
        if (isDraft && !value.trim()) {
          next.headline = "";
        } else if (value.trim().length < 6) {
          next.headline = "Headline needs at least 6 characters to submit.";
        } else if (value.trim().length > 120) {
          next.headline = "Headline must stay under 120 characters.";
        } else {
          next.headline = "";
        }
      }
      if (field === "caption") {
        if (isDraft && !value.trim()) {
          next.caption = "";
        } else if (value.trim().length < 20) {
          next.caption = "Caption needs at least 20 characters to submit.";
        } else if (value.trim().length > 1500) {
          next.caption = "Caption must stay under 1500 characters.";
        } else {
          next.caption = "";
        }
      }
      return next;
    });
  };

  const removeTagStudent = (studentId) => {
    setSelectedTagStudents((prev) =>
      prev.filter((student) => student.student_id !== studentId),
    );
  };

  const handlePublishMemory = async (event) => {
    event.preventDefault();
    setPostError("");
    setPostSuccess("");

    const trimmedHeadline = headline.trim();
    const trimmedCaption = caption.trim();
    const imageUrls = imageQueue
      .filter((item) => item.source === "url")
      .map((item) => item.url);
    const keptImages = imageQueue
      .filter(
        (item) =>
          item.source === "existing" && !removedImageIds.has(String(item.id)),
      )
      .map((item) => ({ id: item.id, url: item.url }));
    if (!isDraft) {
      if (!trimmedHeadline) {
        setPostError("Headline is required.");
        return;
      }

      if (!trimmedCaption) {
        setPostError("Caption is required.");
        return;
      }
    }

    if (!trimmedHeadline && !trimmedCaption && imageQueue.length === 0) {
      setPostError("Draft must include at least text or an image.");
      return;
    }

    const taggedStudentIds = selectedTagStudents.map(
      (student) => student.student_id,
    );

    try {
      setPostLoading(true);
      let result;
      if (editingDraft) {
        result = await memoryService.updateDraft(editingDraft.id, {
          action: isDraft ? "save" : "publish",
          headline: trimmedHeadline,
          caption: trimmedCaption,
          imageUrls,
          taggedStudentIds,
          privacy: postPrivacy,
          clubCode: postPrivacy === "club" ? selectedClubCode : undefined,
          files: imageQueue
            .filter((item) => item.source === "file")
            .map((item) => item.file),
          keptImages,
          removedImageIds: Array.from(removedImageIds),
          imageLayout,
        });
      } else {
        result = await memoryService.createMemory({
          headline: trimmedHeadline,
          caption: trimmedCaption,
          imageUrls,
          files: imageQueue
            .filter((item) => item.source === "file")
            .map((item) => item.file),
          taggedStudentIds,
          privacy: postPrivacy,
          clubCode: postPrivacy === "club" ? selectedClubCode : undefined,
          keptImages,
          removedImageIds: Array.from(removedImageIds),
          imageLayout,
          isDraft,
        });
      }

      const skipped = result.tagsSkipped?.length
        ? ` Some tags were skipped: ${result.tagsSkipped.join(", ")}.`
        : "";

      const draftNote =
        (result.memory?.status || result.status) === "draft"
          ? " Draft saved."
          : "";
      setPostSuccess(
        `${result.message || "Done."}${draftNote}${skipped}`.trim(),
      );
      clearComposer();
      setActiveTab(postPrivacy === "club" ? "department" : postPrivacy);
      setShowPostModal(false);
      await fetchDashboard();
      await fetchDrafts();
    } catch (err) {
      setPostError(err.response?.data?.error || "Failed to post memory.");
    } finally {
      setPostLoading(false);
    }
  };

  const fetchClubs = async () => {
    setClubError("");
    try {
      setClubLoading(true);
      const [clubList, myClubsResult] = await Promise.all([
        clubService.listClubs(),
        clubService.myClubs().catch(() => ({ clubs: [] })),
      ]);

      setClubs(clubList.clubs || []);
      setMyClubCodes(
        new Set((myClubsResult.clubs || []).map((club) => club.code)),
      );
    } catch (err) {
      setClubError(err.response?.data?.error || "Failed to load clubs.");
    } finally {
      setClubLoading(false);
    }
  };

  const toggleClub = async (clubCode, isMember) => {
    if (!clubCode) return;
    try {
      setClubError("");
      if (isMember) {
        await clubService.leave(clubCode);
        setMyClubCodes((prev) => {
          const next = new Set(prev);
          next.delete(clubCode);
          return next;
        });
      } else {
        await clubService.join(clubCode);
        setMyClubCodes((prev) => {
          const next = new Set(prev);
          next.add(clubCode);
          return next;
        });
      }
    } catch (err) {
      setClubError(err.response?.data?.error || "Club action failed.");
    }
  };

  const fetchNotifications = async () => {
    setNotificationError("");
    try {
      setNotificationLoading(true);
      const [tagResult, activityResult] = await Promise.all([
        tagNotificationService.list().catch(() => ({ notifications: [] })),
        activityNotificationService.list().catch(() => ({ notifications: [] })),
      ]);
      setNotifications([
        ...(tagResult.notifications || []).map((notification) => ({
          ...notification,
          notificationKind: "tag",
        })),
        ...(activityResult.notifications || []).map((notification) => ({
          ...notification,
          notificationKind: "activity",
        })),
      ]);
    } catch (err) {
      setNotificationError(
        err.response?.data?.error || "Failed to load notifications.",
      );
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleNotificationDecision = async (notificationId, decision) => {
    if (!notificationId) return;
    try {
      setNotificationError("");
      await tagNotificationService.decide(notificationId, decision);
      await fetchNotifications();
      await fetchDashboard();
    } catch (err) {
      setNotificationError(
        err.response?.data?.error || "Failed to update notification.",
      );
    }
  };

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

  const {
    user,
    department,
    batch,
    public: publicFeed = { albums: [], memories: [] },
  } = data;
  const groups = {
    department,
    batch,
    public: publicFeed,
  };
  const activeGroup = groups[activeTab] || department;
  const hasContent =
    activeGroup.albums.length > 0 || activeGroup.memories.length > 0;

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-inner">
          <h1 className="nav-title">IUT Yearbook</h1>
          <div className="nav-user">
            <button
              className="profile-trigger"
              onClick={openProfileModal}
              title="Open profile"
            >
              <div className="user-avatar">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Profile"
                    className="user-avatar-image"
                  />
                ) : (
                  user.displayName?.charAt(0)?.toUpperCase() || "?"
                )}
              </div>
            </button>
            <div className="user-info">
              <span className="user-name">{user.displayName}</span>
              <span className="user-meta">
                {user.department} &middot; Batch '{user.batch}
              </span>
            </div>
            <Link to="/discover" className="discover-link">
              Discover
            </Link>
            <button className="profile-btn" onClick={openProfileModal}>
              Profile
            </button>
            <button
              className="notification-btn"
              onClick={() => {
                if (!showNotifications) {
                  fetchNotifications();
                }
                setShowNotifications((prev) => !prev);
              }}
            >
              {notificationLoading ? "Loading..." : "Notifications"}
            </button>
            <button
              className="post-btn"
              onClick={() => {
                setPostError("");
                setPostSuccess("");
                setShowPostModal(true);
              }}
            >
              POST
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <NotificationsPanel
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        loading={notificationLoading}
        error={notificationError}
        onRefresh={fetchNotifications}
        onDecision={handleNotificationDecision}
      />

      {showPostModal && (
        <div className="modal-backdrop" onClick={() => setShowPostModal(false)}>
          <section
            className="scrapbook-page post-composer modal-composer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="composer-title">Publish a Memory</h3>
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
                <div className="privacy-row">
                  <label htmlFor="postPrivacy">Privacy</label>
                  <label className="draft-toggle">
                    <input
                      type="checkbox"
                      checked={isDraft}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setIsDraft(checked);
                        if (!checked) {
                          validateField("headline", headline);
                          validateField("caption", caption);
                        }
                      }}
                    />
                    <span>
                      {editingDraft ? "Keep as draft" : "Save as draft"}
                    </span>
                  </label>
                </div>
                <select
                  id="postPrivacy"
                  value={postPrivacy}
                  onChange={(event) => {
                    const nextPrivacy = event.target.value;
                    setPostPrivacy(nextPrivacy);
                    if (nextPrivacy !== "club") {
                      setSelectedClubCode("");
                    }
                  }}
                >
                  <option value="department">Department</option>
                  <option value="batch">Batch</option>
                  <option value="public">Public</option>
                  <option value="club" disabled={myClubCodes.size === 0}>
                    Club
                  </option>
                </select>
              </div>

              {postPrivacy === "club" && (
                <div className="form-group">
                  <label htmlFor="clubSelector">Select club</label>
                  <select
                    id="clubSelector"
                    value={selectedClubCode}
                    onChange={(event) =>
                      setSelectedClubCode(event.target.value)
                    }
                    required
                    disabled={myClubCodes.size === 0}
                  >
                    <option value="" disabled>
                      {myClubCodes.size === 0
                        ? "Join a club first in the Clubs section."
                        : "Choose one of your clubs"}
                    </option>
                    {clubs
                      .filter((club) => myClubCodes.has(club.code))
                      .map((club) => (
                        <option key={club.code} value={club.code}>
                          {club.name} ({club.code})
                        </option>
                      ))}
                  </select>
                  <small className="composer-hint">
                    Club memories stay visible to members of the selected club
                    only.
                  </small>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="headline">Headline</label>
                <input
                  id="headline"
                  type="text"
                  value={headline}
                  onChange={(event) => {
                    const value = event.target.value;
                    setHeadline(value);
                    validateField("headline", value);
                  }}
                  placeholder="Write a short headline"
                  required={!isDraft}
                />
                {liveValidation.headline && (
                  <small className="composer-hint error-hint">
                    {liveValidation.headline}
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="caption">Caption</label>
                <textarea
                  id="caption"
                  value={caption}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCaption(value);
                    validateField("caption", value);
                  }}
                  placeholder="Write your memory caption"
                  rows={4}
                  required={!isDraft}
                />
                {liveValidation.caption && (
                  <small className="composer-hint error-hint">
                    {liveValidation.caption}
                  </small>
                )}
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
                        if (files.length === 0) {
                          return;
                        }
                        const currentCount = imageQueue.length;
                        const availableSlots = Math.max(
                          MAX_UPLOAD_FILES - currentCount,
                          0,
                        );
                        if (availableSlots === 0) {
                          setUploadWarning(
                            "Image tray is full. Remove some photos first.",
                          );
                          event.target.value = "";
                          return;
                        }
                        const withinLimit = files.filter(
                          (file) => file.size <= FILE_SIZE_LIMIT_BYTES,
                        );
                        const oversizedCount =
                          files.length - withinLimit.length;
                        const trimmed = withinLimit.slice(0, availableSlots);
                        const trimmedCount =
                          withinLimit.length - trimmed.length;
                        if (oversizedCount > 0) {
                          setUploadWarning(
                            `Skipped ${oversizedCount} large file${oversizedCount > 1 ? "s" : ""} (${FILE_SIZE_LIMIT_MB}MB max).`,
                          );
                        } else if (trimmedCount > 0) {
                          setUploadWarning(
                            "Limit reached. Some files were not added.",
                          );
                        } else {
                          setUploadWarning("");
                        }
                        const staged = trimmed.map((file, index) => {
                          const queueId = getQueueId("file");
                          return {
                            queueId,
                            source: "file",
                            file,
                            name: file.name,
                            size: file.size,
                            preview: URL.createObjectURL(file),
                            order: currentCount + index,
                          };
                        });
                        setImageQueue((prev) => {
                          const next = [...prev, ...staged];
                          setImageLayout(buildImageLayoutFromQueue(next));
                          setUploadMessage(computeUploadMessage(next.length));
                          return next;
                        });
                      }}
                    />
                    {uploadWarning && (
                      <small className="composer-hint error-hint">
                        {uploadWarning}
                      </small>
                    )}
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
                        onChange={(event) =>
                          setImageUrlsInput(event.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          const trimmed = imageUrlsInput.trim();
                          if (!isValidImageUrl(trimmed)) {
                            setPostError("Enter a full http(s) image link.");
                            return;
                          }
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
                          setUploadWarning("");
                          setImageUrlsInput("");
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <small className="composer-hint">
                      Paste a direct image link to keep it sourced from the web.
                    </small>
                  </div>
                </div>

                <ImageTray
                  images={imageQueue}
                  maxSlots={MAX_UPLOAD_FILES}
                  onDragReorder={(sourceId, targetId, position) => {
                    setImageQueue((prev) => {
                      const next = reorderQueue(
                        prev,
                        sourceId,
                        targetId,
                        position,
                      );
                      setImageLayout(buildImageLayoutFromQueue(next));
                      setUploadMessage(computeUploadMessage(next.length));
                      return next;
                    });
                  }}
                  onRemove={(queueId) => {
                    setImageQueue((prev) => {
                      const target = prev.find(
                        (item) => item.queueId === queueId,
                      );
                      if (target) {
                        revokePreview(target);
                        if (target.source === "existing" && target.id) {
                          setRemovedImageIds((prev) =>
                            new Set(prev).add(String(target.id)),
                          );
                        }
                      }
                      const next = prev.filter(
                        (item) => item.queueId !== queueId,
                      );
                      setImageLayout(buildImageLayoutFromQueue(next));
                      setUploadMessage(computeUploadMessage(next.length));
                      return next;
                    });
                  }}
                  onOrderChange={(nextQueue) => {
                    setImageQueue(nextQueue);
                    setImageLayout(buildImageLayoutFromQueue(nextQueue));
                    setUploadMessage(computeUploadMessage(nextQueue.length));
                  }}
                  renderMeta={(item) => {
                    const size = readableSize(item);
                    const label = getSourceLabel(item.source);
                    if (!size) {
                      return label;
                    }
                    return `${label} · ${size}`;
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tags">
                  Tag students (search by ID or name)
                </label>

                {selectedTagStudents.length > 0 && (
                  <div className="selected-tags">
                    {selectedTagStudents.map((student) => (
                      <button
                        type="button"
                        key={student.student_id}
                        className="selected-tag-chip"
                        onClick={() => removeTagStudent(student.student_id)}
                      >
                        {student.first_name} {student.last_name} (
                        {student.student_id})
                        <span className="chip-remove">x</span>
                      </button>
                    ))}
                  </div>
                )}

                <input
                  id="tags"
                  type="text"
                  value={tagSearch}
                  onChange={(event) =>
                    handleTagSearchChange(event.target.value)
                  }
                  placeholder="Type at least 2 chars of ID or name"
                />

                {(tagSearchLoading || tagSuggestions.length > 0) && (
                  <div className="tag-suggestions">
                    {tagSearchLoading && (
                      <div className="tag-suggestion-item muted">
                        Searching...
                      </div>
                    )}
                    {!tagSearchLoading &&
                      tagSuggestions.map((student) => (
                        <button
                          type="button"
                          key={student.student_id}
                          className="tag-suggestion-item"
                          onClick={() => addTagStudent(student)}
                        >
                          <span className="suggestion-name">
                            {student.first_name} {student.last_name}
                          </span>
                          <span className="suggestion-meta">
                            {student.student_id} - {student.department}
                          </span>
                        </button>
                      ))}
                  </div>
                )}

                <small className="composer-hint">
                  Tagged students must belong to the selected privacy group.
                </small>
              </div>

              {postError && <div className="error-message">{postError}</div>}
              {postSuccess && (
                <div className="success-message">{postSuccess}</div>
              )}

              <div className="composer-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    clearComposer();
                    setShowPostModal(false);
                  }}
                  disabled={postLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={postLoading}
                >
                  {postLoading
                    ? isDraft
                      ? "Saving..."
                      : "Publishing..."
                    : editingDraft
                      ? isDraft
                        ? "Save Draft"
                        : "Publish Draft"
                      : isDraft
                        ? "Save Draft"
                        : "Publish Memory"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showProfileModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowProfileModal(false)}
        >
          <section
            className="scrapbook-page post-composer modal-composer profile-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="composer-title">My Profile</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowProfileModal(false)}
              >
                Close
              </button>
            </div>

            {profileLoading ? (
              <p className="loading-text">Loading profile...</p>
            ) : (
              <>
                <form onSubmit={handleProfileSave} className="composer-form">
                  {profileForm.displayPhoto && (
                    <div className="profile-photo-preview-wrap">
                      <img
                        src={profileForm.displayPhoto}
                        alt="Current profile"
                        className="profile-photo-preview"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="displayPhotoFile">
                      Upload display photo
                    </label>
                    <input
                      id="displayPhotoFile"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setSelectedProfileFile(file);
                      }}
                    />
                    {selectedProfileFile && (
                      <small className="composer-hint">
                        Selected: {selectedProfileFile.name}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="displayPhoto">
                      Display photo URL (optional)
                    </label>
                    <input
                      id="displayPhoto"
                      type="url"
                      value={profileForm.displayPhoto}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          displayPhoto: event.target.value,
                        }))
                      }
                      placeholder="https://example.com/me.jpg"
                    />
                    <small className="composer-hint">
                      If a file is selected above, it will be used instead of
                      this URL.
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="motto">Motto</label>
                    <input
                      id="motto"
                      type="text"
                      value={profileForm.motto}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          motto: event.target.value,
                        }))
                      }
                      placeholder="Your motto"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="bio">Bio</label>
                    <textarea
                      id="bio"
                      rows={4}
                      value={profileForm.bio}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          bio: event.target.value,
                        }))
                      }
                      placeholder="Tell others about yourself"
                    />
                  </div>

                  {profileError && (
                    <div className="error-message">{profileError}</div>
                  )}
                  {profileSuccess && (
                    <div className="success-message">{profileSuccess}</div>
                  )}

                  <button
                    type="submit"
                    className="primary"
                    disabled={profileSaving}
                  >
                    {profileSaving ? "Saving..." : "Save Profile"}
                  </button>
                </form>

                <div className="my-memories-section">
                  <h4 className="section-title profile-section-title">
                    My Memories
                  </h4>

                  <PrivacyMemoryCollection
                    title="Department"
                    memories={myMemories.department || []}
                    formatDate={formatDate}
                  />
                  <PrivacyMemoryCollection
                    title="Batch"
                    memories={myMemories.batch || []}
                    formatDate={formatDate}
                  />
                  <PrivacyMemoryCollection
                    title="Public"
                    memories={myMemories.public || []}
                    formatDate={formatDate}
                  />
                  <DraftManager
                    drafts={drafts}
                    loading={draftLoading}
                    error={draftError}
                    onRefresh={fetchDrafts}
                    onEdit={startEditingDraft}
                    onDelete={async (draftId) => {
                      try {
                        await memoryService.updateDraft(draftId, {
                          action: "delete",
                        });
                        await fetchDrafts();
                      } catch (err) {
                        setDraftError(
                          err.response?.data?.error ||
                            "Failed to delete draft.",
                        );
                      }
                    }}
                    onPublish={async (draftId) => {
                      try {
                        await memoryService.updateDraft(draftId, {
                          action: "publish",
                        });
                        await fetchDrafts();
                        await fetchDashboard();
                      } catch (err) {
                        setDraftError(
                          err.response?.data?.error ||
                            "Failed to publish draft.",
                        );
                      }
                    }}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <main className="dashboard-main">
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
              <span className="welcome-badge id-badge">{user.studentId}</span>
            </div>
            <div className="welcome-actions">
              <Link to="/directory" className="timeline-link">
                Browse Student Directory →
              </Link>
            </div>
          </div>
        </div>

        <div className="group-tabs">
          <button
            className={`tab-btn ${activeTab === "department" ? "active" : ""}`}
            onClick={() => setActiveTab("department")}
          >
            <span className="tab-icon">Dept</span>
            <span className="tab-label">{department.code} Department</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "batch" ? "active" : ""}`}
            onClick={() => setActiveTab("batch")}
          >
            <span className="tab-icon">Batch</span>
            <span className="tab-label">{batch.label}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "public" ? "active" : ""}`}
            onClick={() => setActiveTab("public")}
          >
            <span className="tab-icon">All</span>
            <span className="tab-label">Public</span>
          </button>
        </div>

        <div className="feed-container">
          {!hasContent ? (
            <div className="scrapbook-page empty-state">
              <div className="empty-icon">--</div>
              <h3>No memories yet</h3>
              <p className="empty-text">
                Be the first to share a memory with your{" "}
                {activeTab === "department"
                  ? "department"
                  : activeTab === "batch"
                    ? "batch"
                    : "public feed"}
                !
              </p>
            </div>
          ) : (
            <>
              {activeGroup.albums.length > 0 && (
                <section className="feed-section">
                  <h3 className="section-title">Albums</h3>
                  <div className="albums-grid">
                    {activeGroup.albums.map((album) => (
                      <div key={album.id} className="scrapbook-page album-card">
                        <div className="album-header">
                          <h4 className="album-title">{album.title}</h4>
                          <div className="album-meta">
                            <span className="meta-author">
                              by {album.created_by_name}
                            </span>
                            <span className="meta-date">
                              {formatDate(album.created_at)}
                            </span>
                          </div>
                        </div>

                        {album.memories && album.memories.length > 0 && (
                          <div className="album-memories">
                            {album.memories.map((memory) => (
                              <MemoryCard
                                key={memory.id}
                                memory={memory}
                                formatDate={formatDate}
                              />
                            ))}
                          </div>
                        )}

                        {(!album.memories || album.memories.length === 0) && (
                          <p className="album-empty">
                            No memories in this album yet
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeGroup.memories.length > 0 && (
                <section className="feed-section">
                  <h3 className="section-title">
                    <span className="section-icon">~</span> Recent Memories
                  </h3>
                  <div className="memories-grid">
                    {activeGroup.memories.map((memory) => (
                      <MemoryCard
                        key={memory.id}
                        memory={memory}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <section className="scrapbook-page clubs-section">
          <div className="corner-pin top-left"></div>
          <div className="corner-pin top-right"></div>
          <div className="corner-pin bottom-left"></div>
          <div className="corner-pin bottom-right"></div>

          <header className="clubs-header">
            <div>
              <h3>IUT Clubs</h3>
              <p className="clubs-subtitle">
                Choose the communities that match your passions.
              </p>
            </div>
          </header>

          {clubError && <div className="error-message">{clubError}</div>}

          <div className="clubs-grid">
            {clubLoading && clubs.length === 0 && (
              <p className="loading-text">Loading clubs...</p>
            )}
            {!clubLoading && clubs.length === 0 && (
              <p className="empty-text">No clubs available right now.</p>
            )}

            {clubs.map((club) => {
              const isMember = myClubCodes.has(club.code);
              return (
                <article
                  key={club.id}
                  className={`club-card ${isMember ? "club-card--member" : ""}`}
                >
                  <div className="club-card-body">
                    <div className="club-code">{club.code}</div>
                    <h4 className="club-name">{club.name}</h4>
                    <p className="club-description">{club.description}</p>
                  </div>
                  <footer className="club-card-footer">
                    <div className="club-membership">
                      <span className="club-members-label">Members: </span>
                      <span className="club-members-count">
                        {club.members?.count ?? 0}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`club-action ${isMember ? "leave" : "join"}`}
                      onClick={() => toggleClub(club.code, isMember)}
                      disabled={clubLoading}
                    >
                      {isMember ? "Leave" : "Join"}
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

const NotificationsPanel = ({
  open,
  onClose,
  notifications,
  loading,
  error,
  onRefresh,
  onDecision,
}) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="scrapbook-page notifications-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="composer-title">Notifications</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="notifications-toolbar">
          <button
            type="button"
            className="refresh-clubs"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <p className="loading-text">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="empty-text">No notifications yet.</p>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => {
              if (notification.notificationKind === "tag") {
                return (
                  <article
                    key={`tag-${notification.id}`}
                    className="notification-item"
                  >
                    <header>
                      <h4>{notification.memory_title}</h4>
                      <span className="notification-meta">
                        Requested by{" "}
                        {notification.requested_by_name || "Someone"}
                      </span>
                    </header>
                    <p className="notification-caption">
                      {notification.memory_content}
                    </p>
                    <footer>
                      <button
                        type="button"
                        className="approve"
                        onClick={() => onDecision(notification.id, "approved")}
                        disabled={loading}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="decline"
                        onClick={() => onDecision(notification.id, "declined")}
                        disabled={loading}
                      >
                        Decline
                      </button>
                    </footer>
                  </article>
                );
              }

              return (
                <ActivityNotificationCard
                  key={`activity-${notification.id}`}
                  notification={notification}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

const MemoryCard = ({ memory, formatDate }) => {
  const tagged = memory.tagged_students || [];
  const pending = memory.pending_tags || [];
  const pillText =
    memory.status === "draft"
      ? "Draft"
      : memory.status === "pending"
        ? "Pending review"
        : memory.status === "rejected"
          ? "Needs edits"
          : null;

  return (
    <div className={`memory-card ${pillText ? "memory-card--draft" : ""}`}>
      {pillText && <span className="memory-status-pill">{pillText}</span>}
      <div className="memory-content">
        <h4 className="memory-title">{memory.title}</h4>
        {memory.content && memory.content !== memory.title && (
          <p className="memory-text">{memory.content}</p>
        )}

        {tagged.length > 0 && (
          <div className="memory-tags">
            {tagged.map((student) => (
              <span key={student.student_id} className="memory-tag-chip">
                {student.first_name} {student.last_name}
              </span>
            ))}
          </div>
        )}

        {pending.length > 0 && (
          <div className="memory-pending-tags">
            <span className="pending-label">Awaiting approval:</span>
            <div className="pending-tag-list">
              {pending.map((student) => (
                <span
                  key={student.student_id}
                  className="memory-tag-chip pending"
                >
                  {student.first_name} {student.last_name}
                </span>
              ))}
            </div>
          </div>
        )}

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
        <span className="meta-date">{formatDate(memory.created_at)}</span>
      </div>
    </div>
  );
};

const PrivacyMemoryCollection = ({
  title,
  memories,
  formatDate,
  isDraft = false,
}) => (
  <section className="privacy-memory-group">
    <div className="privacy-title-row">
      <h5 className="privacy-memory-title">{title}</h5>
      {isDraft && memories.length > 0 && (
        <span className="privacy-memory-pill">Draft</span>
      )}
    </div>
    {memories.length === 0 ? (
      <p className="privacy-memory-empty">No memories in this group.</p>
    ) : (
      <div className="profile-memories-grid">
        {memories.map((memory) => {
          const tagged = memory.tagged_students || [];
          const pending = memory.pending_tags || [];

          return (
            <div key={`${title}-${memory.id}`} className="profile-memory-card">
              <h6 className="profile-memory-headline">{memory.title}</h6>
              {memory.content && (
                <p className="profile-memory-content">{memory.content}</p>
              )}
              {tagged.length > 0 && (
                <div className="profile-memory-tags">
                  {tagged.map((student) => (
                    <span key={student.student_id} className="memory-tag-chip">
                      {student.first_name} {student.last_name}
                    </span>
                  ))}
                </div>
              )}
              {pending.length > 0 && (
                <div className="profile-memory-pending">
                  <span className="pending-label">Pending tags:</span>
                  <div className="pending-tag-list">
                    {pending.map((student) => (
                      <span
                        key={student.student_id}
                        className="memory-tag-chip pending"
                      >
                        {student.first_name} {student.last_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {memory.images && memory.images.length > 0 && (
                <div className="profile-memory-images">
                  {memory.images.slice(0, 3).map((img) => (
                    <img key={img.id} src={img.url} alt="" loading="lazy" />
                  ))}
                </div>
              )}
              <span className="profile-memory-date">
                {formatDate(memory.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    )}
  </section>
);

const DraftManager = ({
  drafts,
  loading,
  error,
  onRefresh,
  onEdit,
  onDelete,
  onPublish,
}) => (
  <section className="draft-manager">
    <div className="draft-manager-header">
      <h5>Drafts</h5>
      <button
        type="button"
        className="ghost"
        onClick={onRefresh}
        disabled={loading}
      >
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
    {error && <div className="error-message">{error}</div>}
    {loading ? (
      <p className="loading-text">Loading drafts...</p>
    ) : drafts.length === 0 ? (
      <p className="privacy-memory-empty">
        No drafts yet. Save one from the composer.
      </p>
    ) : (
      <div className="draft-grid">
        {drafts.map((draft) => (
          <article key={draft.id} className="draft-card">
            <header>
              <div>
                <h6>{draft.title || "Untitled draft"}</h6>
                <span className="draft-updated">
                  Updated{" "}
                  {new Date(
                    draft.updated_at || draft.created_at,
                  ).toLocaleDateString("en-US")}
                </span>
              </div>
              <span className="draft-privacy">{draft.album_type}</span>
            </header>
            <p className="draft-preview">
              {draft.content || "No caption yet."}
            </p>
            <footer>
              <button
                type="button"
                className="ghost"
                onClick={() => onEdit(draft)}
              >
                Edit
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => onPublish(draft.id)}
              >
                Publish
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => onDelete(draft.id)}
              >
                Delete
              </button>
            </footer>
          </article>
        ))}
      </div>
    )}
  </section>
);

export default Dashboard;
