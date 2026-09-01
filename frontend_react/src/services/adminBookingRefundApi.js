import apiClient from './apiClient'

const BASE_URL = '/admin/booking-refunds'

const unwrap = (response) => response.data

const adminBookingRefundApi = {
  async list(params = {}) {
    return unwrap(await apiClient.get(BASE_URL, { params }))
  },

  async summary() {
    return unwrap(await apiClient.get(`${BASE_URL}/summary`))
  },

  async timeline(params = {}) {
    return unwrap(await apiClient.get(`${BASE_URL}/timeline`, { params }))
  },

  async show(id) {
    return unwrap(await apiClient.get(`${BASE_URL}/${id}`))
  },

  async refund(id, proofFile) {
    const formData = new FormData()
    formData.append('refund_proof', proofFile)

    return unwrap(await apiClient.post(`${BASE_URL}/${id}/refund`, formData, {
      params: { _method: 'PATCH' },
    }))
  },

  async getPendingCount() {
    const response = await this.summary()
    return Number(response?.data?.refund_pending_count || 0)
  },
}

export default adminBookingRefundApi
