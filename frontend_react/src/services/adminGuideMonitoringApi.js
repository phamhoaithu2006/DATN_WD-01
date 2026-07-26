import apiClient from './apiClient'

export async function getGuidePresence() {
  const response = await apiClient.get('/admin/guides/presence')
  return response?.data ?? response
}

export async function getGuideActivityHistory(id, params = {}) {
  const response = await apiClient.get(`/admin/guides/${id}/activity-history`, { params })
  return response?.data ?? response
}
