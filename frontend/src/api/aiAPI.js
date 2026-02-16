import api from './axiosConfig';

const aiAPI = {
  getDashboardStats: () => api.get('/ai-security/dashboard/'),
  getAnomalyReports: (params) => api.get('/ai-security/anomaly-reports/', { params }),
  getAnomalyReport: (id) => api.get(`/ai-security/anomaly-reports/${id}/`),
  reviewAnomaly: (id, data) => api.post(`/ai-security/anomaly-reports/${id}/review/`, data),
  getModelStatus: () => api.get('/ai-security/model-status/'),
  triggerScan: () => api.post('/ai-security/scan/'),
  getActivityLogs: (params) => api.get('/ai-security/activity-logs/', { params }),
};

export default aiAPI;
