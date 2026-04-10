import api from '../../../../../../../../Desktop/9/9/9/frontend/src/api/axiosInstance';

export const authApi = {
  // Get current logged in user
  getCurrentUser: () => api.get('/auth/me'),
  
  // Logout (if you have a logout endpoint)
  logout: () => api.post('/auth/logout'),
  
  // Check if user is authenticated
  isAuthenticated: () => {
    // You can check for token or cookie
    return localStorage.getItem('token') !== null;
  }
};