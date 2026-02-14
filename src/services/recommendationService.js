import api from './api';

export const recommendationService = {
  getRecommendations: async (fieldId) => {
    return api.post(`/fields/${fieldId}/recommendations`);
  },

  getTransparencyData: async (fieldId) => {
    // Placeholder API call
    return api.get(`/fields/${fieldId}/transparency`);
  },

  getCardReasoning: async (fieldId, title) => {
    return api.post(`/fields/${fieldId}/recommendations/reasoning`, { title });
  },
};






