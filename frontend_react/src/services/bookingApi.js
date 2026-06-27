import apiClient from './apiClient'

const BOOKING_ENDPOINT = '/admin/bookings'
const LEGACY_BOOKING_ENDPOINT = '/admin/admin/bookings'

const unwrap = (response) => response.data

const withBookingEndpointFallback = async (requestFor) => {
  try {
    return await requestFor(BOOKING_ENDPOINT)
  } catch (error) {
    if (error.response?.status === 404) {
      return requestFor(LEGACY_BOOKING_ENDPOINT)
    }

    throw error
  }
}

export const getBookings = async (params) =>
  unwrap(await withBookingEndpointFallback((endpoint) => apiClient.get(endpoint, { params })))

export const getBookingStatistics = async () =>
  unwrap(await withBookingEndpointFallback((endpoint) => apiClient.get(`${endpoint}/statistics`)))

export const getBooking = async (id) =>
  unwrap(await withBookingEndpointFallback((endpoint) => apiClient.get(`${endpoint}/${id}`)))

export const updateBooking = async (id, payload) =>
  unwrap(await withBookingEndpointFallback((endpoint) => apiClient.put(`${endpoint}/${id}`, payload)))

export const cancelBooking = async (id) =>
  unwrap(await withBookingEndpointFallback((endpoint) => apiClient.patch(`${endpoint}/${id}/cancel`)))

export const deleteBooking = async (id) =>
  unwrap(await withBookingEndpointFallback((endpoint) => apiClient.delete(`${endpoint}/${id}`)))
