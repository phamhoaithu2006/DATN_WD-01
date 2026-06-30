import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api";
const ADMIN_URL = `${BASE_URL}/admin`;

const getAuthConfig = () => {
  const token = localStorage.getItem("token") || 
                localStorage.getItem("admin_token") || 
                localStorage.getItem("access_token");

  // Kiểm tra nếu không có token thì throw lỗi hoặc trả về cấu hình không chứa header Authorization
  if (!token) {
    console.error("Token không tồn tại!");
    return { headers: { Accept: "application/json" } };
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`, // Đảm bảo luôn có tiền tố Bearer
      Accept: "application/json",
    },
  };
};

export const tourDepartureApi = {
  getTours() {
    // Thay API_URL thành ADMIN_URL
    return axios.get(`${ADMIN_URL}/tours`, getAuthConfig());
  },

  getByTour(tourId) {
    return axios.get(`${ADMIN_URL}/tours/${tourId}/departures`, getAuthConfig());
  },

  create(tourId, data) {
    return axios.post(
      `${ADMIN_URL}/tours/${tourId}/departures`,
      data,
      getAuthConfig()
    );
  },

  update(id, data) {
    return axios.put(
      `${ADMIN_URL}/tours/departures/${id}`,
      data,
      getAuthConfig()
    );
  },

  remove(id) {
    return axios.delete(
      `${ADMIN_URL}/tours/departures/${id}`,
      getAuthConfig()
    );
  },
};
