import api from './api';

export const advisoryService = {
  getAdvisoryHistory: async (filters = {}) => {
    // Placeholder API call
    return api.get('/advisories', { params: filters });
  },

  getAdvisory: async (advisoryId) => {
    // Placeholder API call
    return api.get(`/advisories/${advisoryId}`);
  },
};






