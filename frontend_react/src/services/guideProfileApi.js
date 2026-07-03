import apiClient from './apiClient'

const GUIDE_PROFILE_ENDPOINT = '/guide/profile'

const toProfileFormData = (payload) => {
  const formData = new FormData()
  formData.append('_method', 'PUT')

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value)
    }
  })

  return formData
}

export const getGuideProfile = async () => {
  const response = await apiClient.get(GUIDE_PROFILE_ENDPOINT)
  return response.data.data
}

export const updateGuideProfile = async (payload) => {
  const response = await apiClient.post(
    GUIDE_PROFILE_ENDPOINT,
    toProfileFormData(payload),
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )

  return response.data
}

export const changeGuidePassword = async (payload) => {
  const response = await apiClient.put('/guide/change-password', payload)
  return response.data
}
