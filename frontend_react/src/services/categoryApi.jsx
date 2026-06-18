// File: src/services/categoryApi.js
// Chứa các API cho chức năng Quản lý loại tour / danh mục tour

import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000/api'

export const categoryApi = {
    // lấy tất cả danh sách Tour
  getAll() {
    return axios.get(`${API_URL}/categories`)
  },
    // tìm kiếm Tour theo tên
  search(name) {
    return axios.get(`${API_URL}/categories/search`, {
      params: { name },
    })
  },
   // thêm mới Tour
  create(data) {
    return axios.post(`${API_URL}/categories`, data)
  },
  // cập nhật Tour
  update(id, data) {
    return axios.put(`${API_URL}/categories/${id}`, data)
  },
   // xóa Tour
  remove(id) {
    return axios.delete(`${API_URL}/categories/${id}`)
  },
   // Lấy danh sách Tour đã bị xóa (trong thùng rác)
  getTrashed() {
    return axios.get(`${API_URL}/categories-trashed`)
  },
    // khôi phục Tour từ thùng rác theo ID
  restore(id) {
    return axios.patch(`${API_URL}/categories/${id}/restore`)
  },
}