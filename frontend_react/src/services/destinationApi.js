import apiClient from './apiClient'

const API_URL = '/admin'

export const destinationApi = {
  getAll() {
    return apiClient.get(`${API_URL}/destinations`)
  },

  getOne(id) {
    return apiClient.get(`${API_URL}/destinations/${id}`)
  },

  search(params) {
    return apiClient.get(`${API_URL}/destinations/search`, {
      params,
    })
  },

  create(data) {
    return apiClient.post(`${API_URL}/destinations`, data)
  },

  update(id, data) {
    return apiClient.put(`${API_URL}/destinations/${id}`, data)
  },

  remove(id) {
    return apiClient.delete(`${API_URL}/destinations/${id}`)
  },

  getTrashed() {
    return apiClient.get(`${API_URL}/destinations/trash/list`)
  },

  restore(id) {
    return apiClient.post(`${API_URL}/destinations/${id}/restore`)
  },

  forceDelete(id) {
    return apiClient.delete(`${API_URL}/destinations/${id}/force-delete`)
  },
}
