import apiClient from './apiClient'

export async function getGuidePresence(params = {}) {
  const response = await apiClient.get('/admin/guides/presence', { params })
  return response?.data ?? response
}

export async function getGuideActivityHistory(id, params = {}) {
  const response = await apiClient.get(`/admin/guides/${id}/activity-history`, { params })
  return response?.data ?? response
}
