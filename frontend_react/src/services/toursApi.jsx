import apiClient from './apiClient'

const tourApi = {
  getAll() {
    return apiClient.get('/admin/tours')
  },
  getById(id) {
    return apiClient.get(`/admin/tours/${id}`)
  },

  getHidden() {
    return apiClient.get('/admin/tours/hidden-list')
  },

  create(data) {
    return apiClient.post('/admin/tours', data)
  },

  update(id, data) {
    data.append('_method', 'PUT')
    return apiClient.post(`/admin/tours/${id}`, data)
  },

  delete(id) {
    return apiClient.delete(`/admin/tours/${id}`)
  },

  hide(id) {
    return apiClient.patch(`/admin/tours/${id}/hide`)
  },

  unhide(id) {
    return apiClient.patch(`/admin/tours/${id}/unhide`)
  },
}

export default tourApi
