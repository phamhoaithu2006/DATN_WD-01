import apiClient from './apiClient'

const ENDPOINT = '/notifications/support'

const unwrapCollection = (payload) => {
  const data = payload?.data

  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(payload)) return payload

  return []
}

export const getSupportNotifications = async (page = 1) => {
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

export const getSupportUnreadNotificationCount = async () => {
  const response = await apiClient.get(`${ENDPOINT}/unread-count`)
  return Number(response.data?.unread_count || 0)
}

export const getSupportNotificationDetail = async (id) => {
  const response = await apiClient.get(`${ENDPOINT}/${id}`)
  return response.data?.data
}

export const markSupportNotificationAsRead = async (id) => {
  const response = await apiClient.patch(`${ENDPOINT}/${id}/read`)
  return response.data
}

export const sendSupportNotification = async (payload) => {
  const response = await apiClient.post(`${ENDPOINT}/send`, payload)
  return response.data
}
