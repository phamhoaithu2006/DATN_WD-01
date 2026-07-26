import apiClient from './apiClient'

export async function sendGuidePresenceHeartbeat() {
  const response = await apiClient.post('/guide/presence/heartbeat')
  return response?.data ?? response
}
