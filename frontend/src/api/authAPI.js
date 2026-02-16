import api from './axiosConfig';

const authAPI = {
  login: (credentials) => api.post('/accounts/login/', credentials),
  verify2FA: (data) => api.post('/accounts/verify-2fa/', data),
  logout: (refreshToken) => api.post('/accounts/logout/', { refresh: refreshToken }),
  refreshToken: (refreshToken) => api.post('/accounts/token/refresh/', { refresh: refreshToken }),
  changePassword: (data) => api.post('/accounts/change-password/', data),
  getUsers: () => api.get('/accounts/users/'),
  getUser: (id) => api.get(`/accounts/users/${id}/`),
};

export default authAPI;
