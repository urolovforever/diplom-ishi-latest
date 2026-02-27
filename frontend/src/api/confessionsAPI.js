import api from './axiosConfig';

const confessionsAPI = {
  // Organizations
  getOrganizations: (params) => api.get('/confessions/organizations/', { params }),
  getAllOrganizations: () => api.get('/confessions/organizations/all/'),
  getOrganization: (id) => api.get(`/confessions/organizations/${id}/`),
  createOrganization: (data) => api.post('/confessions/organizations/', data),
  updateOrganization: (id, data) => api.patch(`/confessions/organizations/${id}/`, data),
  deleteOrganization: (id) => api.delete(`/confessions/organizations/${id}/`),

  // Stats
  getDashboardStats: () => api.get('/confessions/stats/dashboard/'),
};

export default confessionsAPI;
