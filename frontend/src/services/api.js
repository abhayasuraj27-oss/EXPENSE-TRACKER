import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const expenseAPI = {
  // Transaction endpoints
  getTransactions: (params = {}) => api.get('/api/transactions/', { params }),
  saveTransactions: (transactions) => api.post('/api/transactions/batch', { items: transactions }),
  filterTransactions: (filters) => api.get('/api/transactions/filter', { params: filters }),
  
  // Analytics endpoints
  getWeeklyAnalytics: (weeks = 4) => api.get('/api/transactions/analytics/weekly', { params: { weeks } }),
  getMonthlyAnalytics: (months = 12) => api.get('/api/transactions/analytics/monthly', { params: { months } }),
  getCategoryAnalytics: (days = 30) => api.get('/api/transactions/analytics/categories', { params: { period_days: days } }),
  getSpendingSummary: (days = 30) => api.get('/api/transactions/analytics/summary', { params: { period_days: days } }),
  getCalendarData: (year, month) => api.get('/api/transactions/analytics/calendar', { params: { year, month } }),
  
  // Upload endpoints
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/upload/', formData, {
      headers: {
        // Don't set Content-Type for FormData - let browser set it with boundary
      }
    });
  },
  getSupportedFormats: () => api.get('/api/upload/formats'),
};

export default api;