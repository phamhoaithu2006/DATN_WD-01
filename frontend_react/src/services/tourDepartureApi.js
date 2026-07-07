import apiClient from "./apiClient";

export const tourDepartureApi = {
  getTours() {
    return apiClient.get("/admin/tours");
  },

  getByTour(tourId) {
    return apiClient.get(`/admin/tours/${tourId}/departures`);
  },

  create(tourId, data) {
    return apiClient.post(`/admin/tours/${tourId}/departures`, data);
  },

  update(id, data) {
    return apiClient.put(`/admin/tours/departures/${id}`, data);
  },

  remove(id) {
    return apiClient.delete(`/admin/tours/departures/${id}`);
  },
};
