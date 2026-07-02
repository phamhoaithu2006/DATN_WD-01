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

  uploadLogo(id, file) {
    const formData = new FormData()
    formData.append('logo', file)
    return apiClient.post(`${PARTNER_ENDPOINT}/${id}/upload-logo`, formData)
  },

  deleteLogo(id) {
    return apiClient.delete(`${PARTNER_ENDPOINT}/${id}/delete-logo`)
  },

  remove(id) {
    return apiClient.delete(`${PARTNER_ENDPOINT}/${id}`)
  },

  getTrashed(params) {
    return apiClient.get(`${PARTNER_ENDPOINT}/trashed`, { params })
  },

  restore(id) {
    return apiClient.patch(`${PARTNER_ENDPOINT}/${id}/restore`)
  },

  forceDelete(id) {
    return apiClient.delete(`${PARTNER_ENDPOINT}/${id}/force`)
  },
}

