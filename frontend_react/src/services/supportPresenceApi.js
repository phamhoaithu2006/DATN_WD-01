import apiClient from './apiClient'

function getResponseData(response) {
  return response?.data ?? response
}

/**
 * Gửi heartbeat để backend xác định
 * NVHT hiện đang online.
 */
export async function sendSupportPresenceHeartbeat() {
  const response = await apiClient.post(
    '/support/presence/heartbeat',
  )

  return getResponseData(response)
}