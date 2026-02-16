import api from './axiosConfig';

const confessionsAPI = {
  // Organizations
  getOrganizations: () => api.get('/confessions/organizations/'),
  getOrganization: (id) => api.get(`/confessions/organizations/${id}/`),
  createOrganization: (data) => api.post('/confessions/organizations/', data),
  updateOrganization: (id, data) => api.patch(`/confessions/organizations/${id}/`, data),
  deleteOrganization: (id) => api.delete(`/confessions/organizations/${id}/`),

  // Confessions
  getConfessions: (params) => api.get('/confessions/', { params }),
  getConfession: (id) => api.get(`/confessions/${id}/`),
  createConfession: (data) => api.post('/confessions/', data),
  updateConfession: (id, data) => api.patch(`/confessions/${id}/`, data),
  deleteConfession: (id) => api.delete(`/confessions/${id}/`),

  // Transitions
  submitConfession: (id) => api.post(`/confessions/${id}/submit/`),
  reviewConfession: (id) => api.post(`/confessions/${id}/review/`),
  approveConfession: (id) => api.post(`/confessions/${id}/approve/`),
  rejectConfession: (id) => api.post(`/confessions/${id}/reject/`),

  // Stats
  getDashboardStats: () => api.get('/confessions/stats/dashboard/'),
};

export default confessionsAPI;
