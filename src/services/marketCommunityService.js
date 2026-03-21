import api from './api';

const marketCommunityService = {
    getCommunityInsights: async (radiusKm = 15) => {
        const response = await api.get(`/community/insights?radius_km=${radiusKm}`);
        return response.data;
    },

    getCommunityAlerts: async () => {
        const response = await api.get('/community/alerts');
        return response.data;
    },

    getAllFarmers: async () => {
        const response = await api.get('/community/farmers');
        return response.data;
    },

    getMarketPrices: async () => {
        const response = await api.get('/market/prices');
        return response.data;
    },

    getPriceHistory: async (cropName) => {
        const response = await api.get(`/market/prices/${cropName}/history`);
        return response.data;
    },

    getProfitEstimation: async (fieldId) => {
        const response = await api.get(`/market/profit-estimation/${fieldId}`);
        return response.data;
    },

    getMarketAdvisory: async (fieldId) => {
        const response = await api.get(`/market/advisory/${fieldId}`);
        return response.data;
    },

    getChatMessages: async () => {
        const response = await api.get('/community/chat');
        return response.data;
    },

    getCompareAlternatives: async (fieldId) => {
        const response = await api.get(`/market/compare-alternatives/${fieldId}`);
        return response.data;
    },

    postChatMessage: async (text, crop = '') => {
        const response = await api.post('/community/chat', { text, crop });
        return response.data;
    }
};

export default marketCommunityService;
