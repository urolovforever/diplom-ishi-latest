import api from './axiosConfig';

const authAPI = {
  login: (credentials) => api.post('/accounts/login/', credentials),
  verify2FA: (data) => api.post('/accounts/verify-2fa/', data),
  logout: (refreshToken) => api.post('/accounts/logout/', { refresh: refreshToken }),
  refreshToken: (refreshToken) => api.post('/accounts/token/refresh/', { refresh: refreshToken }),
  changePassword: (data) => api.post('/accounts/change-password/', data),
  getUsers: (params) => api.get('/accounts/users/', { params }),
  getUser: (id) => api.get(`/accounts/users/${id}/`),
  inviteUser: (data) => api.post('/accounts/users/', data),
  updateUser: (id, data) => api.patch(`/accounts/users/${id}/`, data),
  getProfile: () => api.get('/accounts/profile/'),
  updateProfile: (data) => api.put('/accounts/profile/', data),
  requestPasswordReset: (email) => api.post('/accounts/password-reset/', { email }),
  confirmPasswordReset: (data) => api.post('/accounts/password-reset/confirm/', data),
};

export default authAPI;
