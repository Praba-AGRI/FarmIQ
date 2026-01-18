import api from './api';

export const chatService = {
  sendMessage: async (fieldId, message) => {
    // Placeholder API call
    return api.post(`/fields/${fieldId}/chat`, { message });
  },

  getChatHistory: async (fieldId) => {
    // Placeholder API call
    return api.get(`/fields/${fieldId}/chat/history`);
  },
};






