import api from './api';

export const profileService = {
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/farmers/me/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  removeProfilePicture: async () => {
    return api.delete('/farmers/me/profile-picture');
  },

  getProfilePicture: (userId) => {
    // Return URL to profile picture
    return `${api.defaults.baseURL}/farmers/me/profile-picture?t=${Date.now()}`;
  },
};

