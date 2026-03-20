import api from './api';

export const recommendationService = {
  generateAdvisory: async (fieldId, lat, lon, language = 'en') => {
    let url = `/fields/${fieldId}/dashboard?language=${language}`;
    if (lat !== undefined && lon !== undefined) {
      url += `&lat=${lat}&lon=${lon}`;
    }
    return api.get(url);
  },

  getTransparencyData: async (fieldId) => {
    return api.get(`/fields/${fieldId}/transparency`);
  }
};
