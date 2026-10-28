import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor: Attach JWT bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('staypulse_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle global response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register')) {
        localStorage.removeItem('staypulse_token');
      }
    }
    return Promise.reject(error);
  }
);

// Helper to construct full media URL if relative
export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const base = API_BASE_URL.replace('/api', '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
};

export const propertiesAPI = {
  getAll: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  getMyProperties: () => api.get('/properties/owner/my-properties'),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
};

export const roomsAPI = {
  getByProperty: (propertyId) => api.get(`/properties/${propertyId}/rooms`),
  getById: (id) => api.get(`/rooms/${id}`),
  getMyRooms: () => api.get('/rooms/owner/my-rooms'),
  create: (propertyId, data) => api.post(`/properties/${propertyId}/rooms`, data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
};

export const uploadAPI = {
  uploadFile: (file, category = 'properties') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', category);
    return api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadBase64: (dataUrl, category = 'properties') => {
    return api.post('/uploads', { dataUrl, category });
  },
};

export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  getMyBookings: () => api.get('/bookings/my-bookings'),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id, reason) => api.patch(`/bookings/${id}/cancel`, { reason }),
  getOwnerBookings: () => api.get('/bookings/owner/my-bookings'),
  getOwnerAnalytics: () => api.get('/bookings/owner/analytics'),
  updateStatus: (id, status, reason) => api.patch(`/bookings/owner/${id}/status`, { status, reason }),
  getAdminStats: () => api.get('/bookings/admin/stats'),
  checkAvailability: (roomId, checkInDate, checkOutDate) =>
    api.get(`/bookings/rooms/${roomId}/availability`, {
      params: { checkInDate, checkOutDate },
    }),
};

export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }),
  getProperties: (params) => api.get('/admin/properties', { params }),
  updatePropertyStatus: (id, status, rejectionReason) =>
    api.patch(`/admin/properties/${id}/status`, { status, rejectionReason }),
};

export default api;
