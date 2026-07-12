import apiClient from './apiClient'

const unwrap = (response) => response.data

function normalizeList(payload) {
  const data = payload?.data ?? payload

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
}

const adminGuideReplacementRequestApi = {
  async list(params = {}) {
    return unwrap(
      await apiClient.get('/admin/guide-replacement-requests', {
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

    return normalizeList(response)
  },

  async approve(id, payload = {}) {
    return unwrap(
      await apiClient.post(
        `/admin/guide-replacement-requests/${id}/approve`,
        payload,
      ),
    )
  },

  async reject(id, payload = {}) {
    return unwrap(
      await apiClient.post(
        `/admin/guide-replacement-requests/${id}/reject`,
        payload,
      ),
    )
  },
}

export default adminGuideReplacementRequestApi