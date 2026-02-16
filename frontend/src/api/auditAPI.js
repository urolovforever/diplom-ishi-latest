import api from './axiosConfig';

const auditAPI = {
  getLogs: (params) => api.get('/audit/', { params }),
  exportCSV: (params) => api.get('/audit/export/', { params, responseType: 'blob' }),
  getReports: (params) => api.get('/audit/reports/', { params }),
  generateReport: (data) => api.post('/audit/reports/', data),
  downloadReport: (id) => api.get(`/audit/reports/${id}/download/`, { responseType: 'blob' }),
};

export default auditAPI;
