// API Base URL - defaults to localhost for development
// Set VITE_API_BASE_URL environment variable for production
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const FARMING_TYPES = {
  ORGANIC: 'organic',
  CONVENTIONAL: 'conventional',
};

export const LANGUAGES = {
  ENGLISH: 'en',
  TAMIL: 'ta',
};

export const RECOMMENDATION_STATUS = {
  DO_NOW: 'do_now',
  WAIT: 'wait',
  MONITOR: 'monitor',
};

export const TIME_RANGES = {
  LAST_24H: '24h',
  LAST_7D: '7d',
  LAST_30D: '30d',
};

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};



