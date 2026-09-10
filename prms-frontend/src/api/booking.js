import { apiClient } from './ApiClient';

export const bookingApi = {
  list(params) {
    return apiClient.get('/bookings', { params });
  },
  myBookings(params) {
    return apiClient.get('/bookings/my-bookings', { params });
  },
  assigned(params) {
    return apiClient.get('/bookings/assigned', { params });
  },
  landlordBookings(params) {
    return apiClient.get('/bookings/landlord', { params });
  },
  getById(id) {
    return apiClient.get(`/bookings/${id}`);
  },
  create(data) {
    return apiClient.post('/bookings', data);
  },
  update(id, data) {
    return apiClient.put(`/bookings/${id}`, data);
  },
  confirm(id) {
    return apiClient.patch(`/bookings/${id}/confirm`);
  },
  reject(id) {
    return apiClient.patch(`/bookings/${id}/reject`);
  },
  cancel(id) {
    return apiClient.patch(`/bookings/${id}/cancel`);
  },
  getBookingsByStatus(status) {
    return apiClient.get('/bookings', { params: { status } });
  },
  getBookingSummary() {
    return apiClient.get('/bookings/summary');
  },
  /**
   * Check for date overlap on a property.
   * Expects params: { propertyId, startDate, endDate }
   * Returns { hasOverlap: boolean, conflictCount: number } without personal data.
   */
  checkOverlap(params) {
    return apiClient.get('/bookings/check-overlap', { params });
  },
};
