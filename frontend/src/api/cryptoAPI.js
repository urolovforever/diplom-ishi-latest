import api from './axiosConfig';

const cryptoAPI = {
  savePublicKey: (data) => api.post('/accounts/public-key/', data),
  getMyKeys: () => api.get('/accounts/public-key/'),
  getUserPublicKey: (userId) => api.get(`/accounts/users/${userId}/public-key/`),
};

export default cryptoAPI;
