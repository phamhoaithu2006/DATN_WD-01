import apiClient from "./apiClient";

function normalizeCancellationPayload(data = {}) {
  if (data?.cancellation_reason) {
    return {
      ...data,
      cancellation_reason: data.cancellation_reason,
    };
  }

  const reasonCode = String(data?.reason_code || "").trim();

  let cancellationReason = "other";

  if (
    reasonCode === "minimum_guests_not_met" ||
    reasonCode === "insufficient_participants"
  ) {
    cancellationReason = "insufficient_participants";
  } else if (reasonCode === "weather_disaster") {
    cancellationReason = "weather_disaster";
  }

  return {
    ...data,
    cancellation_reason: cancellationReason,
  };
}

export const tourDepartureApi = {
  /* -------------------------------------------------------------------------- */
  /* TOUR                                                                       */
  /* -------------------------------------------------------------------------- */

  getTours(params = {}) {
    return apiClient.get("/admin/tours", {
      params: {
        per_page: 1000,
        ...params,
      },
    });
  },

  getTourDetail(id) {
    return apiClient.get(`/admin/tours/${id}`);
  },

  /* -------------------------------------------------------------------------- */
  /* LỊCH KHỞI HÀNH                                                            */
  /* -------------------------------------------------------------------------- */

  getByTour(tourId, params = {}) {
    return apiClient.get(`/admin/tours/${tourId}/departures`, {
      params,
    });
  },

  getAllDepartures(params = {}) {
    return apiClient.get("/admin/tours/departures", {
      params,
    });
  },

  create(tourId, data) {
    return apiClient.post(
      `/admin/tours/${tourId}/departures`,
      data
    );
  },

  update(id, data) {
    return apiClient.put(
      `/admin/tours/departures/${id}`,
      data
    );
  },

  // Hủy lịch khởi hành
  cancelDeparture(id, data = {}) {
    return apiClient.post(
      `/admin/tours/departures/${id}/cancel`,
      normalizeCancellationPayload(data)
    );
  },

  // Alias để tương thích code cũ nếu đang gọi tourDepartureApi.cancel()
  cancel(id, data = {}) {
    return apiClient.post(
      `/admin/tours/departures/${id}/cancel`,
      normalizeCancellationPayload(data)
    );
  },

  remove(id) {
    return apiClient.delete(
      `/admin/tours/departures/${id}`
    );
  },

  getBookedCustomers(departureId, params = {}) {
    return apiClient.get(
      `/admin/tour-departures/${departureId}/booked-customers`,
      {
        params,
      }
    );
  },

  /* -------------------------------------------------------------------------- */
  /* PHÂN CÔNG HƯỚNG DẪN VIÊN                                                  */
  /* -------------------------------------------------------------------------- */

  getGuidePlanning(params = {}) {
    return apiClient.get(
      "/admin/tour-departures/guide-planning",
      {
        params,
      }
    );
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

  getDirectGuideCandidates(departureId, params = {}) {
    return apiClient.get(
      `/admin/tour-departures/${departureId}/direct-guide-candidates`,
      {
        params,
      }
    );
  },

  directAssignGuide(departureId, guideId, options = {}) {
    return apiClient.post(
      `/admin/tour-departures/${departureId}/direct-assign-guide`,
      {
        guide_id: Number(guideId),
        force_area_mismatch: Boolean(
          options.forceAreaMismatch
        ),
      }
    );
  },

  /* -------------------------------------------------------------------------- */
  /* DỮ LIỆU DÙNG CHUNG CHO PHÂN CÔNG HDV                                      */
  /* -------------------------------------------------------------------------- */

  getDestinationOptions(params = {}) {
    return apiClient.get(
      "/admin/guides/destination-options",
      {
        params,
      }
    );
  },

  getLanguages(params = {}) {
    return apiClient.get(
      "/admin/languages",
      {
        params,
      }
    );
  },
};

export default tourDepartureApi;
