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

  getTrashed(params = {}) {
    return apiClient.get('/admin/tours/trashed-list', { params })
  },

  getTrashedById(id) {
    return apiClient.get(`/admin/tours/trashed/${id}`)
  },

  getTimeline(params = {}) {
    return apiClient.get('/admin/tours/timeline', { params })
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

  restore(id) {
    return apiClient.patch(`/admin/tours/${id}/restore`)
  },

  forceDelete(id) {
    return apiClient.delete(`/admin/tours/${id}/force`)
  },
}

export default tourApi
