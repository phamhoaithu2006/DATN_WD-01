import apiClient from './apiClient'

const BASE_URL = '/admin/booking-disruption-requests'

const unwrap = (response) => response.data

const adminBookingDisruptionApi = {
  async list(params = {}) {
    return unwrap(await apiClient.get(BASE_URL, { params }))
  },

  async summary() {
    return unwrap(await apiClient.get(`${BASE_URL}/summary`))
  },

  async show(id) {
    return unwrap(await apiClient.get(`${BASE_URL}/${id}`))
  },

  async approve(id, payload = {}) {
    return unwrap(await apiClient.patch(`${BASE_URL}/${id}/approve`, payload))
  },

  async reject(id, payload = {}) {
    return unwrap(await apiClient.patch(`${BASE_URL}/${id}/reject`, payload))
  },

  async getPendingCount() {
    const response = await this.summary()
    return Number(response?.data?.pending_count || 0)
  },
}

export default adminBookingDisruptionApi
