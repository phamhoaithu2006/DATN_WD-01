import apiClient from './apiClient'

export const certificateApi = {
  // Lấy danh sách toàn bộ chứng chỉ
  getAll: () => {
    return apiClient.get('admin/certificates')
  },

  // Xem chi tiết 1 chứng chỉ
  getById: (id) => {
    return apiClient.get(`admin/certificates/${id}`)
  },

  // Tạo mới chứng chỉ (Gửi lên: { name, issued_by })
  create: (data) => {
    return apiClient.post('admin/certificates', data)
  },

  // Cập nhật chứng chỉ
  update: (id, data) => {
    return apiClient.put(`admin/certificates/${id}`, data)
  },

  // Xóa chứng chỉ
  remove: (id) => {
    return apiClient.delete(`admin/certificates/${id}`)
  }
}