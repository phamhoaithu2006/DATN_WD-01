import apiClient from './apiClient'

const ENDPOINT = '/notifications/customers'

const unwrapCollection = (payload) => {
  const data = payload?.data

  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(payload)) return payload

  return []
}

export const getGuideNotifications = async (page = 1) => {
  const response = await apiClient.get(ENDPOINT, { params: { page } })
  const payload = response.data?.data ?? response.data

  return {
    items: unwrapCollection(payload),
    meta: {
      current_page: payload?.current_page ?? page,
      last_page: payload?.last_page ?? 1,
      total: payload?.total ?? unwrapCollection(payload).length,
    },
  }
}

export const getGuideUnreadNotificationCount = async () => {
  const response = await apiClient.get(`${ENDPOINT}/unread-count`)
  return Number(response.data?.unread_count || 0)
}

export const getGuideNotificationDetail = async (id) => {
  const response = await apiClient.get(`${ENDPOINT}/${id}`)
  return response.data?.data
}

export const markGuideNotificationAsRead = async (id) => {
  const response = await apiClient.patch(`${ENDPOINT}/${id}/read`)
  return response.data
}
