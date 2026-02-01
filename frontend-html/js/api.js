
/**
 * API Service for Frontend-HTML
 * Handles communication with the Backend API
 */

const API_BASE_URL = 'http://localhost:5000/api';

const API = {
    // Helper to get headers with Auth token
    getHeaders: () => {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Generic fetch wrapper
    request: async (endpoint, options = {}) => {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...API.getHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);

            // Handle Unauthorized (Token expired/invalid)
            if (response.status === 401) {
                // Only redirect if not already on login/register pages
                if (!window.location.pathname.includes('login.html') &&
                    !window.location.pathname.includes('register.html')) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'login.html';
                    return;
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API Request Failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth Endpoints
    login: async (email, password) => {
        return API.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    register: async (studentData) => {
        return API.request('/students/register', {
            method: 'POST',
            body: JSON.stringify(studentData)
        });
    },

    // Album Endpoints
    getAlbums: async () => {
        return API.request('/albums');
    },

    getAlbumById: async (id) => {
        return API.request(`/albums/${id}`);
    },

    createAlbum: async (albumData) => {
        return API.request('/albums', {
            method: 'POST',
            body: JSON.stringify(albumData)
        });
    },

    // Club/Explore Endpoints (Mocked for now or implemented if backend exists)
    // ...
};

// Export to window for global access in HTML pages
window.API = API;
