import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authService = {
  // Request OTP
  requestOtp: async (email) => {
    const response = await api.post('/auth/otp/request', { email });
    return response.data;
  },

  // Verify OTP
  verifyOtp: async (email, otp) => {
    const response = await api.post('/auth/otp/verify', { email, otp });
    return response.data;
  },

  // Complete Registration
  completeRegistration: async (registrationToken, password, displayName, studentId) => {
    const response = await api.post('/auth/register/complete', {
      registrationToken,
      password,
      displayName,
      studentId: studentId || null,
    });
    return response.data;
  },

  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

export default api;
