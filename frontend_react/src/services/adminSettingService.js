import apiClient from './apiClient'

export async function getAdminSettings() {
  const { data } = await apiClient.get('/admin/settings')
  return data.data || {}
}

export async function updateAdminSettings(payload) {
  const { data } = await apiClient.put('/admin/settings', payload)
  return data.data || {}
}
