import api from './axiosConfig';

const usersAPI = {
  getUsers: (params) => api.get('/accounts/users/', { params }),
  getUser: (id) => api.get(`/accounts/users/${id}/`),
  createUser: (data) => api.post('/accounts/users/', data),
  updateUser: (id, data) => api.patch(`/accounts/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/accounts/users/${id}/`),
  toggleActive: (id, isActive) => api.patch(`/accounts/users/${id}/`, { is_active: isActive }),
};

export default usersAPI;
