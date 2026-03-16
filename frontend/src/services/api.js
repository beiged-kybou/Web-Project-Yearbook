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

export const adminService = {
  getDashboard: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await api.get('/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  decideMemory: async (memoryId, decision, note) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.post(
      `/admin/memories/${memoryId}/decision`,
      { decision, note },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  },
  decideTag: async (tagId, decision, note) => {
    const token = localStorage.getItem('accessToken');
    const response = await api.post(
      `/admin/tags/${tagId}/decision`,
      { decision, note },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
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
};

export const memoryService = {
  createMemory: async ({ headline, caption, imageUrls, taggedStudentIds, privacy, clubCode, files = [], isDraft = false }) => {
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

export const notificationService = tagNotificationService;

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
