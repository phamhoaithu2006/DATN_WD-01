import apiClient from './apiClient'

const GUIDE_PROFILE_ENDPOINT = '/guide/profile'

export const getGuideProfile = async () => {
  const response = await apiClient.get(GUIDE_PROFILE_ENDPOINT)
  return response.data.data
}

export const updateGuideProfile = async (payload) => {
  const response = await apiClient.put(GUIDE_PROFILE_ENDPOINT, payload)
  return response.data
}

export const changeGuidePassword = async (payload) => {
  const response = await apiClient.put('/guide/change-password', payload)
  return response.data
}
