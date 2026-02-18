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

export const memoryService = {
  createMemory: async ({ headline, caption, imageUrls, taggedStudentIds, privacy, files }) => {
    const token = localStorage.getItem('accessToken');

    const formData = new FormData();
    formData.append('headline', headline);
    formData.append('caption', caption);
    formData.append('privacy', privacy);
    formData.append('imageUrls', JSON.stringify(imageUrls || []));
    formData.append('taggedStudentIds', JSON.stringify(taggedStudentIds || []));

    (files || []).forEach((file) => {
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

export const studentService = {
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
