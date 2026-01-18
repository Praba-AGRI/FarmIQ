import api from './api';

export const sensorService = {
  getCurrentReadings: async (fieldId) => {
    // Placeholder API call
    return api.get(`/fields/${fieldId}/sensors/current`);
  },

  getHistoricalData: async (fieldId, timeRange) => {
    // Placeholder API call
    return api.get(`/fields/${fieldId}/sensors/historical`, {
      params: { range: timeRange },
    });
  },
};






