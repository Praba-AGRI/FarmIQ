import api from './api';

const marketCommunityService = {
    getCommunityInsights: async (radiusKm = 15) => {
        const response = await api.get(`/api/community/insights?radius_km=${radiusKm}`);
        return response.data;
    },

    getMarketPrices: async () => {
        const response = await api.get('/api/market/prices');
        return response.data;
    },

    getProfitEstimation: async (fieldId) => {
        const response = await api.get(`/api/market/profit-estimation/${fieldId}`);
        return response.data;
    },

    getMarketAdvisory: async (fieldId) => {
        const response = await api.get(`/api/market/advisory/${fieldId}`);
        return response.data;
    }
};

export default marketCommunityService;
