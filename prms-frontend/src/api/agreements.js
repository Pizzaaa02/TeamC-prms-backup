import { apiClient } from './ApiClient';

export const agreementApi = {
  list: () => apiClient.get('/agreements'),
  mine: () => apiClient.get('/agreements/mine'),
  get: (id) => apiClient.get(`/agreements/${id}`),
  sign: (id, signature) => apiClient.post(`/agreements/${id}/sign`, { signature }),
  accept: (id, signature) => apiClient.post(`/agreements/${id}/accept`, { signature }),
};
