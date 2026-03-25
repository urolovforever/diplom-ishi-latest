import api from './axiosConfig';

const documentsAPI = {
  getDocuments: (params) => api.get('/documents/', { params }),
  getDocument: (id) => api.get(`/documents/${id}/`),
  uploadDocument: (formData) => api.post('/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateDocument: (id, data) => api.patch(`/documents/${id}/`, data),
  deleteDocument: (id) => api.delete(`/documents/${id}/`),

  // Versions
  getVersions: (docId) => api.get(`/documents/${docId}/versions/`),
  uploadVersion: (docId, formData) => api.post(`/documents/${docId}/versions/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Access logs
  getAccessLogs: (docId) => api.get(`/documents/${docId}/access-logs/`),

  // Share
  shareDocument: (docId, organizationIds) => api.post(`/documents/${docId}/share/`, { organization_ids: organizationIds }),

  // Mark as read
  markDocumentsRead: (data) => api.post('/documents/mark-read/', data),
};

export default documentsAPI;
