import api from './api';

export const farmerService = {
  getProfile: async () => {
    const response = await api.get('/farmers/me');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/farmers/me', profileData);
    return response.data;
  },
};

