import apiClient from "./apiClient";

export const tourDepartureApi = {
  /*
  |--------------------------------------------------------------------------
  | TOUR
  |--------------------------------------------------------------------------
  */

  getTours(params = {}) {
    return apiClient.get("/admin/tours", { params });
  },

  /*
  |--------------------------------------------------------------------------
  | LỊCH KHỞI HÀNH
  |--------------------------------------------------------------------------
  */

  getByTour(tourId, params = {}) {
    return apiClient.get(`/admin/tours/${tourId}/departures`, { params });
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

  getBookedCustomers(departureId, params = {}) {
    return apiClient.get(
      `/admin/tour-departures/${departureId}/booked-customers`,
      { params }
    )
  },

  /*
  |--------------------------------------------------------------------------
  | PHÂN CÔNG HƯỚNG DẪN VIÊN
  |--------------------------------------------------------------------------
  */

  getGuidePlanning(params = {}) {
    return apiClient.get("/admin/tour-departures/guide-planning", { params });
  },

  getGuideCandidates(departureId) {
    return apiClient.get(
      `/admin/tour-departures/${departureId}/guide-candidates`
    );
  },

  autoAssignGuide(departureId) {
    return apiClient.post(
      `/admin/tour-departures/${departureId}/auto-assign-guide`,
      {}
    );
  },

  assignGuide(departureId, guideId) {
    return apiClient.post(
      `/admin/tour-departures/${departureId}/assign-guide`,
      {
        guide_id: Number(guideId),
      }
    );
  },

  cancelGuideAssignment(departureId, assignmentId) {
    return apiClient.patch(
      `/admin/tour-departures/${departureId}/guide-assignments/${assignmentId}/cancel`,
      {}
    );
  },
};

export default tourDepartureApi;
