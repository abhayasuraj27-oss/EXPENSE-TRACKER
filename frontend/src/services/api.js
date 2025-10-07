import axios from 'axios';

// Use relative base URL so CRA proxy forwards to backend (see package.json "proxy")
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Do NOT set a global Content-Type, so FormData uploads can set proper boundaries
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const expenseAPI = {
  // Transaction endpoints
  getTransactions: (params = {}) => api.get('/api/transactions/', { params }),
  createTransaction: (txn) => api.post('/api/transactions/', txn, { headers: { 'Content-Type': 'application/json' } }),
  saveTransactions: (transactions) => api.post('/api/transactions/batch', { items: transactions }, {
    headers: { 'Content-Type': 'application/json' }
  }),
  filterTransactions: (filters) => api.get('/api/transactions/filter', { params: filters }),
  deleteAllTransactions: () => api.delete('/api/transactions/'),
  
  // Analytics endpoints
  getWeeklyAnalytics: (weeks = 4) => api.get('/api/transactions/analytics/weekly', { params: { weeks } }),
  getMonthlyAnalytics: (months = 12) => api.get('/api/transactions/analytics/monthly', { params: { months } }),
  getCategoryAnalytics: (days = 30) => api.get('/api/transactions/analytics/categories', { params: { period_days: days } }),
  getCategoriesByMonth: (mm, year = undefined) => api.get('/api/transactions/analytics/categories-by-month', { params: { mm, year } }),
  getSpendingSummary: (days = 30) => api.get('/api/transactions/analytics/summary', { params: { period_days: days } }),
  getCalendarData: (year, month) => api.get('/api/transactions/analytics/calendar', { params: { year, month } }),
  getByMonth: (mm, year = undefined) => api.get('/api/transactions/analytics/by-month', { params: { mm, year } }),
  
  // Upload endpoints
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/upload/', formData);
  },
  getSupportedFormats: () => api.get('/api/upload/formats'),
  // Single transaction delete
  deleteTransaction: (id) => api.delete(`/api/transactions/${id}`),
};

export const authAPI = {
  signup: ({ email, password }) => api.post('/api/auth/signup', { email, password }),
  login: async ({ email, password }) => {
    const body = new URLSearchParams();
    body.append('username', email);
    body.append('password', password);
    // OAuth2PasswordRequestForm requires x-www-form-urlencoded
    const res = await api.post('/api/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res;
  },
};

export default api;