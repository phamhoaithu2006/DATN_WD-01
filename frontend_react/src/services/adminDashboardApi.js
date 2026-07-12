import apiClient from './apiClient'

const safeGet = async (url, config = {}) => {
  try {
    return (await apiClient.get(url, config)).data
  } catch {
    return null
  }
}

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
  const [overviewPayload, chartsPayload, bookingStatsPayload, customerStatsPayload, guideStatsPayload, supportStatsPayload, tourStatsPayload, bookingsPayload, toursPayload] = await Promise.all([
    safeGet('/admin/reports/overview', { params: { year } }),
    safeGet('/admin/reports/charts', { params: { year } }),
    safeGet('/admin/bookings/statistics'),
    safeGet('/admin/customers/statistics'),
    safeGet('/admin/guides/statistics'),
    safeGet('/admin/support-staff/statistics'),
    safeGet('/admin/tours/statistics', { params: { year } }),
    safeGet('/admin/bookings', { params: { per_page: 5, sort_by: 'created_at', sort_dir: 'desc' } }),
    safeGet('/admin/tours', { params: { per_page: 5 } }),
  ])

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
