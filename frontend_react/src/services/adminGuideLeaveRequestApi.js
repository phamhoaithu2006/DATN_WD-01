import apiClient from './apiClient'

const unwrap = (response) => response.data

function normalizeItems(payload) {
  const data = payload?.data ?? payload

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
}

const adminGuideLeaveRequestApi = {
  async list(params = {}) {
    return unwrap(
      await apiClient.get('/admin/guide-leave-requests', {
        params,
      }),
    )
  },

  async getPending(params = {}) {
    const response = await this.list({
      status: 'pending',
      per_page: 100,
      ...params,
    })

    return normalizeItems(response)
  },

  async getPendingCount() {
    const response = await this.list({
      status: 'pending',
      per_page: 1,
    })

    return Number(response?.summary?.pending_count || 0)
  },

  async show(id) {
    return unwrap(await apiClient.get(`/admin/guide-leave-requests/${id}`))
  },

  async approve(id, payload = {}) {
    return unwrap(
      await apiClient.post(`/admin/guide-leave-requests/${id}/approve`, payload),
    )
  },

  async reject(id, payload = {}) {
    return unwrap(
      await apiClient.post(`/admin/guide-leave-requests/${id}/reject`, payload),
    )
  },

  async updateDecision(id, payload = {}) {
    return unwrap(
      await apiClient.patch(`/admin/guide-leave-requests/${id}/decision`, payload),
    )
  },
}

export { normalizeItems }
export default adminGuideLeaveRequestApi