import { apiClient } from './ApiClient';

export const agreementApi = {
  mine: () => apiClient.get('/agreements/mine'),
  get: (id) => apiClient.get(`/agreements/${id}`),
  accept: (id, signature) => apiClient.post(`/agreements/${id}/accept`, { signature }),
};
