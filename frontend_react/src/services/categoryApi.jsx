// File: src/services/categoryApi.js
// Chứa các API cho chức năng Quản lý loại tour / danh mục tour

import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000/api/admin'

export const categoryApi = {
  // Lấy tất cả danh sách loại tour
  getAll() {
    return axios.get(`${API_URL}/categories`)
  },

  // Tìm kiếm loại tour theo tên
  search(name) {
    return axios.get(`${API_URL}/categories/search`, {
      params: { name },
    })
  },

  // Thêm mới loại tour
  create(data) {
    return axios.post(`${API_URL}/categories`, data)
  },

  // Cập nhật loại tour
  update(id, data) {
    return axios.put(`${API_URL}/categories/${id}`, data)
  },

  // Xóa loại tour
  remove(id) {
    return axios.delete(`${API_URL}/categories/${id}`)
  },

  // Lấy danh sách loại tour đã bị xóa mềm
  getTrashed() {
    return axios.get(`${API_URL}/categories-trashed`)
  },

  // Khôi phục loại tour từ thùng rác theo ID
  restore(id) {
    return axios.patch(`${API_URL}/categories/${id}/restore`)
  },
}