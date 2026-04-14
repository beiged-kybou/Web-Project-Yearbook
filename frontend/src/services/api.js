import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authService = {
  requestOtp: async (email) => {
    const response = await api.post('/auth/otp/request', { email });
    return response.data;
  },

  verifyOtp: async (email, otp) => {
    const response = await api.post('/auth/otp/verify', { email, otp });
    return response.data;
  },

  completeRegistration: async (registrationToken, password, accountName) => {
    const response = await api.post('/auth/register/complete', {
      registrationToken,
      password,
      accountName,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

export const dashboardService = {
  getDashboard: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

const authorized = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
});

export const adminService = {
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard', authorized());
    return response.data;
  },
  decideMemory: async (memoryId, decision, note) => {
    const response = await api.post(
      `/admin/memories/${memoryId}/decision`,
      { decision, note },
      authorized(),
    );
    return response.data;
  },
  decideTag: async (tagId, decision, note) => {
    const response = await api.post(
      `/admin/tags/${tagId}/decision`,
      { decision, note },
      authorized(),
    );
    return response.data;
  },
};

export const roleService = {
  listAccess: async () => {
    const response = await api.get('/roles/access', authorized());
    return response.data;
  },
  updateRole: async (userId, role) => {
    const response = await api.post(
      `/roles/access/${userId}/role`,
      { role },
      authorized(),
    );
    return response.data;
  },
  revokeAccess: async (userId) => {
    const response = await api.delete(`/roles/access/${userId}`, authorized());
    return response.data;
  },
};

export const batchService = {
  list: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/batches', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  get: async (year) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get(`/batches/${year}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

export const clubService = {
  listClubs: async () => {
    const response = await api.get('/clubs');
    return response.data;
  },
  myClubs: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/clubs/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  join: async (clubCode) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.post(`/clubs/${clubCode}/join`, null, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  leave: async (clubCode) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.delete(`/clubs/${clubCode}/leave`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  getClubMemories: async (clubCode) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get(`/memories/club/${clubCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

export const memoryService = {
  getFeed: async ({ page = 1, limit = 10, search } = {}) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/memories/feed', {
      params: { page, limit, search: search || undefined },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  searchPublicMemories: async (query, options = {}) =>
    memoryService.getFeed({ page: 1, limit: options.limit || 10, search: query }),
  react: async (memoryId, reactionType) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.post(
      `/memories/${memoryId}/reactions`,
      { reactionType },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  },
  removeReaction: async (memoryId) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.delete(`/memories/${memoryId}/reactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  listComments: async (memoryId, { page = 1, limit = 20 } = {}) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get(`/memories/${memoryId}/comments`, {
      params: { page, limit },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  addComment: async (memoryId, body) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.post(
      `/memories/${memoryId}/comments`,
      { body },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  },
  updateComment: async (memoryId, commentId, body) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.put(
      `/memories/${memoryId}/comments/${commentId}`,
      { body },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  },
  deleteComment: async (memoryId, commentId) => {
    const token = localStorage.getItem('accessToken');
        const response = await api.delete(`/memories/${memoryId}/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  deleteMemory: async (memoryId) => {
    const token = localStorage.getItem("accessToken");
    const response = await api.delete(`/memories/${memoryId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  createMemory: async ({
 headline, caption, imageUrls, taggedStudentIds, privacy, clubCode, files = [], keptImages = [], removedImageIds = [], imageLayout = [], isDraft = false }) => {
    const token = localStorage.getItem('accessToken');

    const formData = new FormData();
    formData.append('headline', headline);
    formData.append('caption', caption);
    formData.append('privacy', privacy);
    if (privacy === 'club' && clubCode) {
      formData.append('clubCode', clubCode);
    }
    formData.append('isDraft', String(isDraft));
    formData.append('imageUrls', JSON.stringify(imageUrls || []));
    formData.append('taggedStudentIds', JSON.stringify(taggedStudentIds || []));
    formData.append('keptImages', JSON.stringify(keptImages || []));
    formData.append('removedImageIds', JSON.stringify(removedImageIds || []));
    formData.append('imageLayout', JSON.stringify(imageLayout || []));

    files.forEach((file) => {
      formData.append('images', file);
    });

    const response = await api.post(
      '/memories',
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },
  listDrafts: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/memories/drafts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  updateDraft: async (draftId, { action = 'save', headline, caption, imageUrls, taggedStudentIds, privacy, clubCode, files = [], keptImages = [], removedImageIds = [], imageLayout = [] }) => {
    const token = localStorage.getItem('accessToken');

    const formData = new FormData();
    formData.append('action', action);
    if (headline !== undefined) formData.append('headline', headline);
    if (caption !== undefined) formData.append('caption', caption);
    if (privacy) formData.append('privacy', privacy);
    if (privacy === 'club' && clubCode) {
      formData.append('clubCode', clubCode);
    }
    if (imageUrls) {
      formData.append('imageUrls', JSON.stringify(imageUrls));
    }
    if (taggedStudentIds) {
      formData.append('taggedStudentIds', JSON.stringify(taggedStudentIds));
    }
    if (keptImages) {
      formData.append('keptImages', JSON.stringify(keptImages));
    }
    if (removedImageIds) {
      formData.append('removedImageIds', JSON.stringify(removedImageIds));
    }
    if (imageLayout) {
      formData.append('imageLayout', JSON.stringify(imageLayout));
    }

    files.forEach((file) => {
      formData.append('images', file);
    });

    const response = await api.put(`/memories/drafts/${draftId}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const yearbookService = {
  listAssignedPages: async () => {
    const response = await api.get('/yearbooks/me/pages', authorized());
    return response.data;
  },
  getPage: async (pageId) => {
    const response = await api.get(`/yearbooks/pages/${pageId}`, authorized());
    return response.data;
  },
  updatePage: async (pageId, payload) => {
    const response = await api.put(`/yearbooks/pages/${pageId}`, payload, authorized());
    return response.data;
  },
  submitPage: async (pageId) => {
    const response = await api.post(`/yearbooks/pages/${pageId}/submit`, null, authorized());
    return response.data;
  },
  uploadPageImage: async (pageId, formData) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.post(`/yearbooks/pages/${pageId}/images`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  removeImage: async (pageId, imageId) => {
    const response = await api.delete(`/yearbooks/pages/${pageId}/images/${imageId}`, authorized());
    return response.data;
  },
  attachPost: async (pageId, entityType, entityId) => {
    const response = await api.post(
      `/yearbooks/pages/${pageId}/posts`,
      { entityType, entityId },
      authorized(),
    );
    return response.data;
  },
  removeAttachment: async (pageId, attachmentId) => {
    const response = await api.delete(
      `/yearbooks/pages/${pageId}/posts/${attachmentId}`,
      authorized(),
    );
    return response.data;
  },
  approvePage: async (pageId) => {
    const response = await api.post(`/yearbooks/pages/${pageId}/approve`, null, authorized());
    return response.data;
  },
  listReleases: async ({ status } = {}) => {
    const response = await api.get('/yearbooks', {
      ...authorized(),
      params: status ? { status } : undefined,
    });
    return response.data;
  },
  createRelease: async ({ title, year, theme, introText, coverPhotoUrl, coverFile }) => {
    const token = localStorage.getItem('accessToken');
    const formData = new FormData();
    if (title !== undefined) formData.append('title', title);
    if (year !== undefined) formData.append('year', year);
    if (theme !== undefined) formData.append('theme', theme);
    if (introText !== undefined) formData.append('introText', introText);
    if (coverPhotoUrl) formData.append('coverPhotoUrl', coverPhotoUrl);
    if (coverFile) formData.append('cover', coverFile);
    const response = await api.post('/yearbooks', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  updateReleaseStatus: async (releaseId, status) => {
    const response = await api.patch(
      `/yearbooks/${releaseId}/status`,
      { status },
      authorized(),
    );
    return response.data;
  },
  listReleasePages: async (releaseId) => {
    const response = await api.get(`/yearbooks/${releaseId}/pages`, authorized());
    return response.data;
  },
  assignPageOwner: async (pageId, payload) => {
    const response = await api.put(`/yearbooks/pages/${pageId}/assign`, payload, authorized());
    return response.data;
  },
  listPublicReleases: async () => {
    const response = await api.get('/yearbooks/public');
    return response.data;
  },
  getPublishedRelease: async (releaseId) => {
    const response = await api.get(`/yearbooks/public/${releaseId}`);
    return response.data;
  },
  previewPersonalYearbook: async (params) => {
    const response = await api.get('/yearbooks/preview', { params, ...authorized() });
    return response.data;
  },
  createPersonalYearbook: async (formData) => {
    const response = await api.post('/yearbooks/personal', formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const tagNotificationService = {
  list: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/tag-notifications/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  decide: async (notificationId, decision, note) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.post(
      `/tag-notifications/${notificationId}/decision`,
      { decision, note },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  },
};

export const activityNotificationService = {
  list: async ({ page = 1, limit = 20 } = {}) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/activity-notifications/me', {
      params: { page, limit },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  markRead: async (notificationId) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.post(
      `/activity-notifications/${notificationId}/read`,
      null,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  },
  markAllRead: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await api.post(
      `/activity-notifications/me/mark-all`,
      null,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  },
};

export const studentService = {
  list: async ({ search = '', department = '', batch, page = 1, limit = 24 } = {}) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/students', {
      params: {
        search: search || undefined,
        department: department || undefined,
        batch: batch || undefined,
        page,
        limit,
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  searchStudents: async (query) => {
    const response = await api.get('/students/search', {
      params: { name: query },
    });
    return response.data;
  },

  getMyProfile: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/students/me/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  updateMyProfile: async ({ displayPhoto, motto, bio, displayPhotoFile }) => {
    const token = localStorage.getItem('accessToken');

    const formData = new FormData();
    formData.append('displayPhoto', displayPhoto || '');
    formData.append('motto', motto || '');
    formData.append('bio', bio || '');
    if (displayPhotoFile) {
      formData.append('displayPhotoFile', displayPhotoFile);
    }

    const response = await api.put(
      '/students/me/profile',
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },
};

export default api;
