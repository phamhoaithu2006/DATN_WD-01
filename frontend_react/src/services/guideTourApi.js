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
// api trang lịch làm việc HDV
export const getGuideTourOverview = async (departureId) =>
  unwrap(await apiClient.get(`/guide/tours/${departureId}/overview`)).data

export const getGuideTourCustomers = async (departureId, params = {}) =>
  unwrap(await apiClient.get(`/guide/tours/${departureId}/customers`, { params }))

export const getGuideTourCustomerDetail = async (departureId, participantId) =>
  unwrap(await apiClient.get(`/guide/tours/${departureId}/customers/${participantId}`)).data

export const getGuideAttendanceStatistics = async (departureId, params = {}) =>
  unwrap(await apiClient.get(`/guide/tours/${departureId}/attendance/statistics`, { params })).data

export const getGuideAttendanceSessions = async (departureId) =>
  unwrap(await apiClient.get(`/guide/tours/${departureId}/attendance-sessions`)).data

export const createGuideAttendanceSession = async (departureId, payload) =>
  unwrap(await apiClient.post(`/guide/tours/${departureId}/attendance-sessions`, payload)).data

export const checkInGuideCustomer = async (departureId, sessionId, participantId) =>
  unwrap(
    await apiClient.post(
      `/guide/tours/${departureId}/attendance-sessions/${sessionId}/check-in`,
      { participant_id: participantId },
    ),
  ).data

export const checkOutGuideCustomer = async (departureId, sessionId, participantId) =>
  unwrap(
    await apiClient.post(
      `/guide/tours/${departureId}/attendance-sessions/${sessionId}/check-out`,
      { participant_id: participantId },
    ),
  ).data

export const getGuideTourStages = async (departureId) =>
  unwrap(await apiClient.get(`/guide/tours/${departureId}/stages`)).data

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
