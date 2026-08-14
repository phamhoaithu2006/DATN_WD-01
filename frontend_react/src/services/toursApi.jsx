import apiClient from './apiClient'

const tourApi = {
  getAll(params = {}) {
    return apiClient.get('/admin/tours', { params })
  },
  getById(id) {
    return apiClient.get(`/admin/tours/${id}`)
  },

  getHidden() {
    return apiClient.get('/admin/tours/hidden-list')
  },

  getTimeline() {
    return apiClient.get('/admin/tours/timeline')
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
