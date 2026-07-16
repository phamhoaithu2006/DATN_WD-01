// File: src/services/categoryApi.js
// Chứa các API cho chức năng Quản lý loại tour / danh mục tour

import apiClient from './apiClient'

const API_URL = '/admin'

const buildCategoryFormData = (data, method = 'POST') => {
  const formData = new FormData()

  if (method !== 'POST') {
    formData.append('_method', method)
  }

  formData.append('name', data.name || '')
  formData.append('description', data.description || '')
  formData.append('status', data.status || 'active')

  if (Object.prototype.hasOwnProperty.call(data, 'thumbnail_alt_text')) {
    formData.append('thumbnail_alt_text', data.thumbnail_alt_text || '')
  }

  if (data.thumbnail_image instanceof File) {
    formData.append('thumbnail_image', data.thumbnail_image)
  }

  return formData
}

export const categoryApi = {
  // Lấy tất cả danh sách loại tour
  getAll() {
    return apiClient.get(`${API_URL}/categories`)
  },

  // Tìm kiếm loại tour theo tên
  search(name) {
    return apiClient.get(`${API_URL}/categories/search`, {
      params: { name },
    })
  },

  // Thêm mới loại tour
  create(data) {
    return apiClient.post(`${API_URL}/categories`, buildCategoryFormData(data), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Cập nhật loại tour
  update(id, data) {
    return apiClient.post(`${API_URL}/categories/${id}`, buildCategoryFormData(data, 'PUT'), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Xóa loại tour
  remove(id) {
    return apiClient.delete(`${API_URL}/categories/${id}`)
  },

  // Lấy danh sách loại tour đã bị xóa mềm
  getTrashed() {
    return apiClient.get(`${API_URL}/categories-trashed`)
  },

  // Khôi phục loại tour từ thùng rác theo ID
  restore(id) {
    return apiClient.patch(`${API_URL}/categories/${id}/restore`)
  },
}
