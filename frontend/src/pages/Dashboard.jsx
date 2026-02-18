import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService, memoryService, studentService } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('department');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [headline, setHeadline] = useState('');
    const [caption, setCaption] = useState('');
    const [imageUrlsInput, setImageUrlsInput] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [tagSearch, setTagSearch] = useState('');
    const [selectedTagStudents, setSelectedTagStudents] = useState([]);
    const [tagSuggestions, setTagSuggestions] = useState([]);
    const [tagSearchLoading, setTagSearchLoading] = useState(false);
    const [postPrivacy, setPostPrivacy] = useState('public');
    const [postLoading, setPostLoading] = useState(false);
    const [postError, setPostError] = useState('');
    const [postSuccess, setPostSuccess] = useState('');
    const [showPostModal, setShowPostModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const [profileForm, setProfileForm] = useState({ displayPhoto: '', motto: '', bio: '' });
    const [selectedProfileFile, setSelectedProfileFile] = useState(null);
    const [myMemories, setMyMemories] = useState({ department: [], batch: [], public: [] });

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

    const openProfileModal = async () => {
        setProfileError('');
        setProfileSuccess('');
        setShowProfileModal(true);
        setProfileLoading(true);

        try {
            const result = await studentService.getMyProfile();
            setProfileForm({
                displayPhoto: result.profile?.displayPhoto || '',
                motto: result.profile?.motto || '',
                bio: result.profile?.bio || '',
            });
            setSelectedProfileFile(null);
            setMyMemories(result.memories || { department: [], batch: [], public: [] });
        } catch (err) {
            setProfileError(err.response?.data?.error || 'Failed to load profile.');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleProfileSave = async (event) => {
        event.preventDefault();
        setProfileError('');
        setProfileSuccess('');

        try {
            setProfileSaving(true);
            const result = await studentService.updateMyProfile({
                ...profileForm,
                displayPhotoFile: selectedProfileFile,
            });
            setProfileForm({
                displayPhoto: result.profile?.displayPhoto || '',
                motto: result.profile?.motto || '',
                bio: result.profile?.bio || '',
            });
            setSelectedProfileFile(null);
            setMyMemories(result.memories || { department: [], batch: [], public: [] });
            setProfileSuccess('Profile updated successfully.');
            await fetchDashboard();
        } catch (err) {
            setProfileError(err.response?.data?.error || 'Failed to update profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const isStudentAllowedForPrivacy = (student) => {
        if (!data?.user) return true;

        if (postPrivacy === 'public') return true;
        if (postPrivacy === 'department') {
            return student.department === data.user.department;
        }
        if (postPrivacy === 'batch') {
            return Number(student.graduation_year) === Number(data.user.graduationYear);
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

            const alreadySelected = new Set(selectedTagStudents.map((student) => student.student_id));
            const currentStudentId = data?.user?.studentId || '';
            const filtered = (result.students || [])
                .filter((student) => String(student.student_id) !== String(currentStudentId))
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
        setTagSearch('');
        setTagSuggestions([]);
    };

    const removeTagStudent = (studentId) => {
        setSelectedTagStudents((prev) => prev.filter((student) => student.student_id !== studentId));
    };

    const handlePublishMemory = async (event) => {
        event.preventDefault();
        setPostError('');
        setPostSuccess('');

        const trimmedHeadline = headline.trim();
        const trimmedCaption = caption.trim();
        if (!trimmedHeadline) {
            setPostError('Headline is required.');
            return;
        }

        if (!trimmedCaption) {
            setPostError('Caption is required.');
            return;
        }

        const imageUrls = imageUrlsInput
            .split(/\n|,/)
            .map((item) => item.trim())
            .filter(Boolean);

        const taggedStudentIds = selectedTagStudents.map((student) => student.student_id);

        try {
            setPostLoading(true);
            const result = await memoryService.createMemory({
                headline: trimmedHeadline,
                caption: trimmedCaption,
                imageUrls,
                files: selectedFiles,
                taggedStudentIds,
                privacy: postPrivacy,
            });

            const skipped = result.tagsSkipped?.length
                ? ` Some tags were skipped: ${result.tagsSkipped.join(', ')}.`
                : '';

            setPostSuccess(`Posted successfully.${skipped}`);
            setHeadline('');
            setCaption('');
            setImageUrlsInput('');
            setSelectedFiles([]);
            setTagSearch('');
            setSelectedTagStudents([]);
            setTagSuggestions([]);
            setActiveTab(postPrivacy);
            setShowPostModal(false);
            await fetchDashboard();
        } catch (err) {
            setPostError(err.response?.data?.error || 'Failed to post memory.');
        } finally {
            setPostLoading(false);
        }
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

    const { user, department, batch, public: publicFeed = { albums: [], memories: [] } } = data;
    const groups = {
        department,
        batch,
        public: publicFeed,
    };
    const activeGroup = groups[activeTab] || department;
    const hasContent = activeGroup.albums.length > 0 || activeGroup.memories.length > 0;

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav">
                <div className="nav-inner">
                    <h1 className="nav-title">IUT Yearbook</h1>
                    <div className="nav-user">
                        <button className="profile-trigger" onClick={openProfileModal} title="Open profile">
                            <div className="user-avatar">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Profile" className="user-avatar-image" />
                                ) : (
                                    user.displayName?.charAt(0)?.toUpperCase() || '?'
                                )}
                            </div>
                        </button>
                        <div className="user-info">
                            <span className="user-name">{user.displayName}</span>
                            <span className="user-meta">{user.department} &middot; Batch '{user.batch}</span>
                        </div>
                        <button className="profile-btn" onClick={openProfileModal}>
                            Profile
                        </button>
                        <button
                            className="post-btn"
                            onClick={() => {
                                setPostError('');
                                setPostSuccess('');
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
                                <label htmlFor="postPrivacy">Privacy</label>
                                <select
                                    id="postPrivacy"
                                    value={postPrivacy}
                                    onChange={(event) => setPostPrivacy(event.target.value)}
                                >
                                    <option value="department">Department</option>
                                    <option value="batch">Batch</option>
                                    <option value="public">Public</option>
                                </select>
                            </div>

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
                                <label htmlFor="localImages">Upload from device</label>
                                <input
                                    id="localImages"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(event) => {
                                        const files = Array.from(event.target.files || []);
                                        setSelectedFiles(files);
                                    }}
                                />
                                {selectedFiles.length > 0 && (
                                    <small className="composer-hint">
                                        {selectedFiles.length} file(s) selected.
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="imageUrls">Image URLs (comma or newline separated)</label>
                                <textarea
                                    id="imageUrls"
                                    value={imageUrlsInput}
                                    onChange={(event) => setImageUrlsInput(event.target.value)}
                                    placeholder="https://example.com/image1.jpg"
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="tags">Tag students (search by ID or name)</label>

                                {selectedTagStudents.length > 0 && (
                                    <div className="selected-tags">
                                        {selectedTagStudents.map((student) => (
                                            <button
                                                type="button"
                                                key={student.student_id}
                                                className="selected-tag-chip"
                                                onClick={() => removeTagStudent(student.student_id)}
                                            >
                                                {student.first_name} {student.last_name} ({student.student_id})
                                                <span className="chip-remove">x</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <input
                                    id="tags"
                                    type="text"
                                    value={tagSearch}
                                    onChange={(event) => handleTagSearchChange(event.target.value)}
                                    placeholder="Type at least 2 chars of ID or name"
                                />

                                {(tagSearchLoading || tagSuggestions.length > 0) && (
                                    <div className="tag-suggestions">
                                        {tagSearchLoading && (
                                            <div className="tag-suggestion-item muted">Searching...</div>
                                        )}
                                        {!tagSearchLoading && tagSuggestions.map((student) => (
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
                            {postSuccess && <div className="success-message">{postSuccess}</div>}

                            <button type="submit" className="primary" disabled={postLoading}>
                                {postLoading ? 'Publishing...' : 'Publish Memory'}
                            </button>
                        </form>
                    </section>
                </div>
            )}

            {showProfileModal && (
                <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
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
                                        <label htmlFor="displayPhotoFile">Upload display photo</label>
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
                                        <label htmlFor="displayPhoto">Display photo URL (optional)</label>
                                        <input
                                            id="displayPhoto"
                                            type="url"
                                            value={profileForm.displayPhoto}
                                            onChange={(event) => setProfileForm((prev) => ({
                                                ...prev,
                                                displayPhoto: event.target.value,
                                            }))}
                                            placeholder="https://example.com/me.jpg"
                                        />
                                        <small className="composer-hint">
                                            If a file is selected above, it will be used instead of this URL.
                                        </small>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="motto">Motto</label>
                                        <input
                                            id="motto"
                                            type="text"
                                            value={profileForm.motto}
                                            onChange={(event) => setProfileForm((prev) => ({
                                                ...prev,
                                                motto: event.target.value,
                                            }))}
                                            placeholder="Your motto"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="bio">Bio</label>
                                        <textarea
                                            id="bio"
                                            rows={4}
                                            value={profileForm.bio}
                                            onChange={(event) => setProfileForm((prev) => ({
                                                ...prev,
                                                bio: event.target.value,
                                            }))}
                                            placeholder="Tell others about yourself"
                                        />
                                    </div>

                                    {profileError && <div className="error-message">{profileError}</div>}
                                    {profileSuccess && <div className="success-message">{profileSuccess}</div>}

                                    <button type="submit" className="primary" disabled={profileSaving}>
                                        {profileSaving ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </form>

                                <div className="my-memories-section">
                                    <h4 className="section-title profile-section-title">My Memories</h4>

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
                            <span className="welcome-badge id-badge">
                                {user.studentId}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="group-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'department' ? 'active' : ''}`}
                        onClick={() => setActiveTab('department')}
                    >
                        <span className="tab-icon">Dept</span>
                        <span className="tab-label">{department.code} Department</span>
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
                        onClick={() => setActiveTab('batch')}
                    >
                        <span className="tab-icon">Batch</span>
                        <span className="tab-label">{batch.label}</span>
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'public' ? 'active' : ''}`}
                        onClick={() => setActiveTab('public')}
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
                                Be the first to share a memory with your{' '}
                                {activeTab === 'department'
                                    ? 'department'
                                    : activeTab === 'batch'
                                        ? 'batch'
                                        : 'public feed'}!
                            </p>
                        </div>
                    ) : (
                        <>
                            {activeGroup.albums.length > 0 && (
                                <section className="feed-section">
                                    <h3 className="section-title">
                                        Albums
                                    </h3>
                                    <div className="albums-grid">
                                        {activeGroup.albums.map((album) => (
                                            <div key={album.id} className="scrapbook-page album-card">
                                                <div className="album-header">
                                                    <h4 className="album-title">{album.title}</h4>
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

                            {activeGroup.memories.length > 0 && (
                                <section className="feed-section">
                                    <h3 className="section-title">
                                        <span className="section-icon">~</span> Recent Memories
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

const MemoryCard = ({ memory, formatDate }) => (
    <div className="memory-card">
        <div className="memory-content">
            <h4 className="memory-title">{memory.title}</h4>
            {memory.content && memory.content !== memory.title && <p className="memory-text">{memory.content}</p>}

            {memory.tagged_students && memory.tagged_students.length > 0 && (
                <div className="memory-tags">
                    {memory.tagged_students.map((student) => (
                        <span key={student.student_id} className="memory-tag-chip">
                            {student.first_name} {student.last_name}
                        </span>
                    ))}
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

const PrivacyMemoryCollection = ({ title, memories, formatDate }) => (
    <section className="privacy-memory-group">
        <h5 className="privacy-memory-title">{title}</h5>
        {memories.length === 0 ? (
            <p className="privacy-memory-empty">No memories in this group.</p>
        ) : (
            <div className="profile-memories-grid">
                {memories.map((memory) => (
                    <div key={`${title}-${memory.id}`} className="profile-memory-card">
                        <h6 className="profile-memory-headline">{memory.title}</h6>
                        {memory.content && <p className="profile-memory-content">{memory.content}</p>}
                        {memory.images && memory.images.length > 0 && (
                            <div className="profile-memory-images">
                                {memory.images.slice(0, 3).map((img) => (
                                    <img key={img.id} src={img.url} alt="" loading="lazy" />
                                ))}
                            </div>
                        )}
                        <span className="profile-memory-date">{formatDate(memory.created_at)}</span>
                    </div>
                ))}
            </div>
        )}
    </section>
);

export default Dashboard;
