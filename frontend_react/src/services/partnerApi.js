import apiClient from './apiClient'

const PARTNER_ENDPOINT =
  (import.meta.env.VITE_PARTNER_API_URL || '/admin/partners').replace(/\/$/, '')

export const partnerApi = {
  getAll(params) {
    return apiClient.get(PARTNER_ENDPOINT, { params })
  },

  getStatistics() {
    return apiClient.get(`${PARTNER_ENDPOINT}/statistics`)
  },

  getServiceTypes() {
    return apiClient.get(`${PARTNER_ENDPOINT}/service-types`)
  },

  getOne(id) {
    return apiClient.get(`${PARTNER_ENDPOINT}/${id}`)
  },

  create(payload) {
    return apiClient.post(PARTNER_ENDPOINT, payload)
  },

  update(id, payload) {
    return apiClient.put(`${PARTNER_ENDPOINT}/${id}`, payload)
  },

  remove(id) {
    return apiClient.delete(`${PARTNER_ENDPOINT}/${id}`)
  },

  getTrashed() {
    return apiClient.get(`${PARTNER_ENDPOINT}/trashed`)
  },

  restore(id) {
    return apiClient.patch(`${PARTNER_ENDPOINT}/${id}/restore`)
  },

  forceDelete(id) {
    return apiClient.delete(`${PARTNER_ENDPOINT}/${id}/force`)
  },
}

