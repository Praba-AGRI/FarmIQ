import api from './api';

export const recommendationService = {
  getRecommendations: async (fieldId) => {
    // Placeholder API call
    return api.get(`/fields/${fieldId}/recommendations`);
  },

  getTransparencyData: async (fieldId) => {
    // Placeholder API call
    return api.get(`/fields/${fieldId}/transparency`);
  },
};






