import apiClient from './apiClient'

const unwrap = (response) => response.data

export const getGuideTours = async (params = {}) =>
  unwrap(await apiClient.get('/guide/tours', { params }))

export const getGuideTourUpcoming = async (params = {}) =>
  unwrap(await apiClient.get('/guide/tours/upcoming', { params }))

export const getGuideTourOngoing = async (params = {}) =>
  unwrap(await apiClient.get('/guide/tours/ongoing', { params }))

export const getGuideTourCompleted = async (params = {}) =>
  unwrap(await apiClient.get('/guide/tours/completed', { params }))

export const getGuideTourDetail = async (departureId) =>
  unwrap(await apiClient.get(`/guide/tours/${departureId}`)).data

export const requestGuideReplacement = async (departureId, payload = {}) => {
  const formData = new FormData()

  formData.append('reason', payload.reason || '')

  if (payload.evidence) {
    formData.append('evidence', payload.evidence)
  }

  const response = await apiClient.post(
    `/guide/tours/${departureId}/replacement-requests`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )

  return response.data
}

export const getGuideReplacementRequestStatus = async (departureId) =>
  unwrap(
    await apiClient.get(
      `/guide/tours/${departureId}/replacement-requests/status`,
    ),
  )
export const getGuideReviews = async (params = {}) =>
  unwrap(await apiClient.get('/guide/reviews', { params }))
