import api from './api';

export const recommendationService = {
  getRecommendations: async (fieldId, lat, lon, language = 'en') => {
    let url = `/fields/${fieldId}/recommendations?language=${language}`;
    if (lat !== undefined && lon !== undefined) {
      url += `&lat=${lat}&lon=${lon}`;
    }
    return api.post(url);
  },
  
  generateAdvisory: async (fieldId, lat, lon, language = 'en') => {
    let url = `/fields/${fieldId}/advisory/generate?language=${language}`;
    if (lat !== undefined && lon !== undefined) {
      url += `&lat=${lat}&lon=${lon}`;
    }
    return api.post(url);
  },

  getTransparencyData: async (fieldId) => {
    // Placeholder API call
    return api.get(`/fields/${fieldId}/transparency`);
  },

  getCardReasoning: async (fieldId, title, language = 'en') => {
    return api.post(`/fields/${fieldId}/recommendations/reasoning`, {
      title,
      language
    });
  }
};
