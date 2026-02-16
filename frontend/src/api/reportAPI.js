import api from './axiosConfig';

const reportAPI = {
  getReports: (params) => api.get('/audit/reports/', { params }),
  generateReport: (data) => api.post('/audit/reports/', data),
  downloadReport: (id) => api.get(`/audit/reports/${id}/download/`, { responseType: 'blob' }),
};

export default reportAPI;
