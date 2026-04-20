import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8081/api',  // Your backend URL
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Important for OAuth2 cookies
});

// Request interceptor to add token if needed
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;