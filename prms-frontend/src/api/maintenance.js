import { apiClient } from './ApiClient';

export const maintenanceApi = {
  list(params) {
    return apiClient.get('/maintenance', { params });
  },
  mine() {
    return apiClient.get('/maintenance/mine');
  },
  getById(id) {
    return apiClient.get(`/maintenance/${id}`);
  },
  createTicket(data) {
    return apiClient.post('/maintenance', data);
  },
  getTicketsByStatus(status) {
    return apiClient.get('/maintenance', { params: { status } });
  },
  updateStatus(id, status) {
    return apiClient.put(`/maintenance/${id}`, { status: status.toUpperCase() });
  },
  assignToAgent(ticketId, agentId) {
    return apiClient.patch(`/maintenance/${ticketId}/assign`, { agentId });
  },
  addNote(ticketId, note) {
    return apiClient.post(`/maintenance/${ticketId}/notes`, { note });
  },
  addPhoto(ticketId, formData) {
    return apiClient.post(`/maintenance/${ticketId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
