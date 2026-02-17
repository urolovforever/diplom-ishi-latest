import api from './axiosConfig';

const cryptoAPI = {
  // Save current user's public key
  savePublicKey: (data) => api.post('/accounts/e2e/keys/', data),

  // Get current user's key info (public key + encrypted private key backup)
  getMyKeys: () => api.get('/accounts/e2e/keys/'),

  // Get a specific user's public key
  getUserPublicKey: (userId) => api.get(`/accounts/e2e/keys/${userId}/`),

  // Get all recipients' public keys for a confession (admins + org leader + author)
  getRecipients: (organizationId) =>
    api.get('/accounts/e2e/recipients/', {
      params: organizationId ? { organization: organizationId } : {},
    }),
  savePublicKey: (data) => api.post('/accounts/public-key/', data),
  getMyKeys: () => api.get('/accounts/public-key/'),
  getUserPublicKey: (userId) => api.get(`/accounts/users/${userId}/public-key/`),
};

export default cryptoAPI;
