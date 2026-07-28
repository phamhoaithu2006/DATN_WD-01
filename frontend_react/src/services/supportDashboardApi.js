import apiClient from './apiClient'

export async function getSupportDashboard() {
  const response = await apiClient.get('/support/dashboard')
  return response.data?.data || { stats: {}, priority_requests: [] }
}
