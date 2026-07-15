import apiClient from './apiClient'

const SUPPORT_PROFILE_ENDPOINT = '/support/profile'

export const getSupportProfile = async () => {
  const response = await apiClient.get(SUPPORT_PROFILE_ENDPOINT)
  return response.data.data
}

export const updateSupportProfile = async (payload) => {
  const response = await apiClient.put(SUPPORT_PROFILE_ENDPOINT, payload)
  return response.data
}

export const changeSupportPassword = async (payload) => {
  const response = await apiClient.put('/support/change-password', payload)
  return response.data
}
