import api from './api';

export const weatherService = {
  /**
   * Get live weather data with current conditions and forecasts
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise} API response with current, minutely, hourly, and daily forecasts
   */
  getLiveWeather: async (latitude, longitude) => {
    return api.get('/weather/live', {
      params: {
        lat: latitude,
        lon: longitude
      }
    });
  },

  /**
   * Get historical weather data for climate analysis
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {string} date - Optional date in YYYY-MM-DD format (defaults to yesterday)
   * @returns {Promise} API response with historical weather data
   */
  getWeatherHistory: async (latitude, longitude, date = null) => {
    const params = {
      lat: latitude,
      lon: longitude
    };
    if (date) {
      params.date = date;
    }
    return api.get('/weather/history', { params });
  },

  /**
   * Get AI-generated weather summary for today and tomorrow
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise} API response with summary_today and summary_tomorrow
   */
  getWeatherSummary: async (latitude, longitude) => {
    return api.get('/weather/summary', {
      params: {
        lat: latitude,
        lon: longitude
      }
    });
  },

  /**
   * Ask AI a weather-related question
   * @param {string} question - The weather question to ask
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise} API response with answer, confidence, and weather_context
   */
  askWeatherAI: async (question, latitude, longitude) => {
    return api.post('/weather/ai-help', {
      question,
      lat: latitude,
      lon: longitude
    });
  },

  /**
   * Get government weather alerts
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise} API response with alerts array
   */
  getWeatherAlerts: async (latitude, longitude) => {
    return api.get('/weather/alerts', {
      params: {
        lat: latitude,
        lon: longitude
      }
    });
  },
};