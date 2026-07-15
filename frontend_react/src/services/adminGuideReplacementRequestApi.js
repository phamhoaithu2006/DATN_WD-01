import apiClient from './apiClient'

const BASE_URL = '/admin/guide-replacement-requests'

const unwrap = (response) => response.data

function normalizeItems(payload) {
  const data = payload?.data ?? payload

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
}

const adminGuideReplacementRequestApi = {
  async list(params = {}) {
    return unwrap(
      await apiClient.get(BASE_URL, {
        params,
      }),
    )
  },

  async getAll(params = {}) {
    return this.list(params)
  },

  async getPending(params = {}) {
    const response = await this.list({
      status: 'pending',
      per_page: 100,
      ...params,
    })

    return normalizeItems(response)
  },

  async getPendingCount(params = {}) {
    const response = await this.list({
      status: 'pending',
      per_page: 1,
      ...params,
    })

    return Number(
      response?.summary?.pending_count ||
        response?.meta?.total ||
        response?.data?.total ||
        normalizeItems(response).length ||
        0,
    )
  },

  async getByDeparture(departureId, params = {}) {
    return this.list({
      tour_departure_id: departureId,
      departure_id: departureId,
      ...params,
    })
  },

  async getPendingByDeparture(departureId, params = {}) {
    return this.getPending({
      tour_departure_id: departureId,
      departure_id: departureId,
      ...params,
    })
  },

  async show(id) {
    return unwrap(await apiClient.get(`${BASE_URL}/${id}`))
  },

  async detail(id) {
    return this.show(id)
  },

  async approve(id, payload = {}) {
    return unwrap(
      await apiClient.post(`${BASE_URL}/${id}/approve`, payload),
    )
  },

  async reject(id, payload = {}) {
    return unwrap(
      await apiClient.post(`${BASE_URL}/${id}/reject`, payload),
    )
  },

  async updateDecision(id, payload = {}) {
    return unwrap(
      await apiClient.patch(`${BASE_URL}/${id}/decision`, payload),
    )
  },

  async process(id, payload = {}) {
    const status = payload?.status

    if (status === 'approved') {
      return this.approve(id, payload)
    }

    if (status === 'rejected') {
      return this.reject(id, payload)
    }

    return this.updateDecision(id, payload)
  },
}

export { normalizeItems }
export default adminGuideReplacementRequestApi