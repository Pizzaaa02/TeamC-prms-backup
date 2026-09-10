import { apiClient } from './ApiClient';

export const privacyApi = {
  notice: () => apiClient.get('/privacy/notice'),
  consents: () => apiClient.get('/privacy/consents'),
  recordConsent: (purpose, granted) => apiClient.post('/privacy/consents', { purpose, granted }),
  exportData: () => apiClient.get('/privacy/export'),
  myRequests: () => apiClient.get('/privacy/requests/mine'),
  submitRequest: (type, details) => apiClient.post('/privacy/requests', { type, details }),
  allRequests: () => apiClient.get('/privacy/requests'),
  updateRequest: (id, status, response) => apiClient.patch(`/privacy/requests/${id}`, { status, response }),
  breaches: () => apiClient.get('/privacy/breaches'),
  createBreach: (data) => apiClient.post('/privacy/breaches', data),
  retentionCleanup: (notificationDays = 365, auditDays = 730) => apiClient.post('/privacy/retention/cleanup', { notificationDays, auditDays }),
};
