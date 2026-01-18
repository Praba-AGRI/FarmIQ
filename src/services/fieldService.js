import api from './api';

export const fieldService = {
  getAllFields: async () => {
    // Placeholder API call
    return api.get('/fields');
  },

  getField: async (fieldId) => {
    // Placeholder API call
    return api.get(`/fields/${fieldId}`);
  },

  createField: async (fieldData) => {
    // Placeholder API call
    return api.post('/fields', fieldData);
  },

  updateField: async (fieldId, fieldData) => {
    // Placeholder API call
    return api.put(`/fields/${fieldId}`, fieldData);
  },

  deleteField: async (fieldId) => {
    // Placeholder API call
    return api.delete(`/fields/${fieldId}`);
  },
};






