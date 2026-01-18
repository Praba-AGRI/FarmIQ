import api from './api';

export const authService = {
  login: async (credentials) => {
    // Placeholder API call
    return api.post('/auth/login', credentials);
  },

  signup: async (userData) => {
    // Placeholder API call
    return api.post('/auth/signup', userData);
  },

  logout: async () => {
    // Placeholder API call
    return api.post('/auth/logout');
  },
};






