import apiClient from './apiClient'

const BASE_URL = '/admin/destination-places'

export const destinationPlaceApi = {
  getAll(params) {
    return apiClient.get(BASE_URL, { params })
  },
  getById(id) {
    return apiClient.get(`${BASE_URL}/${id}`)
  },
  create(data) {
    return apiClient.post(BASE_URL, data)
  },
  update(id, data) {
    return apiClient.put(`${BASE_URL}/${id}`, data)
  },
  remove(id) {
    return apiClient.delete(`${BASE_URL}/${id}`)
  },
  getTrashed(params) {
    return apiClient.get(`${BASE_URL}/trashed`, { params })
  },
  restore(id) {
    return apiClient.patch(`${BASE_URL}/${id}/restore`)
  },
  forceDelete(id) {
    return apiClient.delete(`${BASE_URL}/${id}/force-delete`)
  },
}

export default destinationPlaceApi
