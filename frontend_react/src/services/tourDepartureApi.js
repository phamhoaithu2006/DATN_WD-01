import axios from "axios";
import apiClient from "./apiClient";

const BASE_URL = "http://127.0.0.1:8000/api";
const ADMIN_URL = `${BASE_URL}/admin`;

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("admin_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
};

const formatBearerToken = (token) => {
  if (!token) return "";

  return token.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;
};

const getAuthConfig = (config = {}) => {
  const token = getToken();

  return {
    ...config,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: formatBearerToken(token),
          }
        : {}),

      ...(config.headers || {}),
    },
  };
};

export const tourDepartureApi = {
  /*
  |--------------------------------------------------------------------------
  | TOUR
  |--------------------------------------------------------------------------
  */

  getTours(params = {}) {
    return axios.get(
      `${ADMIN_URL}/tours`,
      getAuthConfig({ params })
    );
  },

  /*
  |--------------------------------------------------------------------------
  | LỊCH KHỞI HÀNH
  |--------------------------------------------------------------------------
  */

  getByTour(tourId, params = {}) {
    return axios.get(
      `${ADMIN_URL}/tours/${tourId}/departures`,
      getAuthConfig({ params })
    );
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

  /*
  |--------------------------------------------------------------------------
  | PHÂN CÔNG HƯỚNG DẪN VIÊN
  |--------------------------------------------------------------------------
  */

  getGuidePlanning(params = {}) {
    return axios.get(
      `${ADMIN_URL}/tour-departures/guide-planning`,
      getAuthConfig({ params })
    );
  },

  getGuideCandidates(departureId) {
    return axios.get(
      `${ADMIN_URL}/tour-departures/${departureId}/guide-candidates`,
      getAuthConfig()
    );
  },

  autoAssignGuide(departureId) {
    return axios.post(
      `${ADMIN_URL}/tour-departures/${departureId}/auto-assign-guide`,
      {},
      getAuthConfig()
    );
  },

  assignGuide(departureId, guideId) {
    return axios.post(
      `${ADMIN_URL}/tour-departures/${departureId}/assign-guide`,
      {
        guide_id: Number(guideId),
      },
      getAuthConfig()
    );
  },

  cancelGuideAssignment(departureId, assignmentId) {
    return axios.patch(
      `${ADMIN_URL}/tour-departures/${departureId}/guide-assignments/${assignmentId}/cancel`,
      {},
      getAuthConfig()
    );
  },
};

export default tourDepartureApi;
