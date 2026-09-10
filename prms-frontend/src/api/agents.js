/* Agent API endpoints (T-00.4 / T-00.5) */
import { apiClient } from '../api';
import { apiClient } from './ApiClient';

export const agentApi = {
  list: (params) => apiClient.get('/agents', { params }),
  getById: (id) => apiClient.get(`/agents/${id}`),
  create: (data) => apiClient.post('/agents', data),
  update: (id, data) => apiClient.put(`/agents/${id}`, data),
  remove: (id) => apiClient.delete(`/agents/${id}`),
  assignProperty: (agentId, propertyId) => apiClient.post(`/agents/${agentId}/assign`, { propertyId }),
  getAssignedProperties: (agentId) => apiClient.get(`/agents/${agentId}/properties`),
  getMyProperties: () => apiClient.get('/agents/mine/properties'),
  getMyBookings: () => apiClient.get('/agents/mine/bookings'),
};
