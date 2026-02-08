import api from './api';

export const chatService = {
  sendMessage: async (fieldId, message, language = 'en') => {
    return api.post(`/fields/${fieldId}/chat`, { message, language });
  },

  getChatHistory: async (fieldId) => {
    return api.get(`/fields/${fieldId}/chat/history`);
  },
};






