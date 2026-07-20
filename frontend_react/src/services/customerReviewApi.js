import apiClient from './apiClient'

export async function getCustomerNotifications(page = 1) {
  const response = await apiClient.get('/notifications/customers', {
    params: { page },
  })

  return response.data?.data || {}
}

export async function getCustomerUnreadNotificationCount() {
  const response = await apiClient.get('/notifications/customers/unread-count')

  return Number(response.data?.unread_count || 0)
}

export async function getCustomerNotificationDetail(notificationId) {
  const response = await apiClient.get(
    `/notifications/customers/${notificationId}`,
  )

  return response.data?.data || null
}

export async function markCustomerNotificationAsRead(notificationId) {
  const response = await apiClient.patch(
    `/notifications/customers/${notificationId}/read`,
  )

  return response.data
}

export async function getReviewableGuideBookings(params = {}) {
  const response = await apiClient.get(
    '/customer/guide-reviewable-bookings',
    {
      params,
    },
  )

  return response.data?.data || {}
}

export async function submitCustomerGuideReview(payload) {
  const response = await apiClient.post(
    '/customer/guide-reviews',
    payload,
  )

  return response.data
}