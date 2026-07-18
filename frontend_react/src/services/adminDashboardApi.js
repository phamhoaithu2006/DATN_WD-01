import apiClient from './apiClient'

const unwrapData = (payload) => {
  if (!payload) return {}
  if (payload.data && !Array.isArray(payload.data)) {
    return payload.data
  }
  return payload
}

const normalizeList = (payload) => {
  const data = payload?.data ?? payload

  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  if (Array.isArray(data?.items)) {
    return data.items
  }

  return []
}

export const getAdminDashboardSnapshot = async (year) => {
  const responses = await Promise.all([
    apiClient.get('/admin/reports/overview', { params: { year } }),
    apiClient.get('/admin/reports/charts', { params: { year } }),
    apiClient.get('/admin/bookings/statistics', { params: { year } }),
    apiClient.get('/admin/customers/statistics'),
    apiClient.get('/admin/guides/statistics'),
    apiClient.get('/admin/support-staff/statistics'),
    apiClient.get('/admin/tours/statistics', { params: { year } }),
    apiClient.get('/admin/bookings', { params: { per_page: 5, sort_by: 'created_at', sort_dir: 'desc' } }),
    apiClient.get('/admin/tours', { params: { per_page: 5 } }),
  ])

  const [overviewPayload, chartsPayload, bookingStatsPayload, customerStatsPayload, guideStatsPayload, supportStatsPayload, tourStatsPayload, bookingsPayload, toursPayload] = responses.map((response) => response.data)

  return {
    overview: unwrapData(overviewPayload),
    charts: unwrapData(chartsPayload),
    bookingStats: unwrapData(bookingStatsPayload),
    customerStats: unwrapData(customerStatsPayload),
    guideStats: unwrapData(guideStatsPayload),
    supportStats: unwrapData(supportStatsPayload),
    tourStats: unwrapData(tourStatsPayload),
    recentBookings: normalizeList(bookingsPayload),
    recentTours: normalizeList(toursPayload),
  }
}
