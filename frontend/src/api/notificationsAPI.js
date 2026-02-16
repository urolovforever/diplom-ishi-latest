import api from './axiosConfig';

const notificationsAPI = {
  getNotifications: (params) => api.get('/notifications/', { params }),
  getNotification: (id) => api.get(`/notifications/${id}/`),
  deleteNotification: (id) => api.delete(`/notifications/${id}/`),
  markRead: (data) => api.post('/notifications/mark-read/', data),
  getUnreadCount: () => api.get('/notifications/unread-count/'),

  // Alert configs
  getAlertConfigs: () => api.get('/notifications/alert-configs/'),
  createAlertConfig: (data) => api.post('/notifications/alert-configs/', data),
  updateAlertConfig: (id, data) => api.patch(`/notifications/alert-configs/${id}/`, data),
  deleteAlertConfig: (id) => api.delete(`/notifications/alert-configs/${id}/`),
};

export default notificationsAPI;
