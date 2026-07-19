import axios from 'axios'
import { readToken } from './authStorage'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
})



api.interceptors.request.use((config) => {
  const token = readToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export async function fetchTours(params = {}) {
  const response = await api.get("/tours", { params });

  return response.data?.data || [];
}

export async function fetchHomeContent() {
  const response = await api.get('/home')

  return response.data?.data || {}
}

export async function fetchCatalogCategories() {
  const response = await api.get('/catalog/categories')

  return response.data?.data || []
}

export async function fetchCatalogDestinations() {
  const response = await api.get('/catalog/destinations')

  return response.data?.data || []
}

export async function filterTours(params = {}) {
  const response = await api.get('/tours/filter', { params })

  return response.data?.data || []
}

export async function fetchTourDetail(slug) {
  const response = await api.get(`/tours/${slug}`)

  return response.data?.data || response.data
}

export async function fetchWishlist() {
  const response = await api.get('/tours/wishlist')

  return response.data?.data || []
}

export async function fetchProfileSummary() {
  const response = await api.get('/profile/summary')

  return response.data?.data
}

export async function fetchBookings() {
  const response = await api.get('/profile/bookings')

  return response.data?.data || []
}

export async function previewCustomerBooking(payload) {
  const response = await api.post('/customer/bookings/preview', payload)

  return response.data?.data || null
}

export async function createCustomerBooking(payload) {
  const response = await api.post('/customer/bookings', payload)

  return response.data?.data || response.data
}

export async function continueCustomerBookingPayment(bookingId) {
  const response = await api.post(`/customer/bookings/${bookingId}/continue-payment`)

  return response.data?.data || response.data
}

export async function cancelCustomerBooking(bookingId) {
  const response = await api.patch(`/customer/bookings/${bookingId}/cancel`)

  return response.data?.data || response.data
}

export async function fetchVnpayPaymentStatus(paymentId) {
  const response = await api.get(`/customer/payments/vnpay/${paymentId}`)

  return response.data?.data || response.data
}

export async function fetchVnpayReturnStatus(params) {
  const response = await api.get('/vnpay/return-status', { params })

  return response.data?.data || response.data
}

export async function askTravelAssistant(message) {
  const response = await api.post('/travel-assistant', { message })

  return response.data?.data || response.data
}

export async function addWishlist(tourId) {
  return api.post('/tours/wishlist', { tour_id: tourId })
}

export async function removeWishlist(tourId) {
  return api.delete(`/tours/wishlist/${tourId}`)
}

export async function updateProfile(payload) {
  const formData = new FormData();

  // POST + _method=PUT để Laravel nhận được cả file avatar.
  formData.append("_method", "PUT");
  formData.append("full_name", String(payload.full_name || "").trim());
  formData.append("phone", String(payload.phone || "").trim());

  if (payload.avatar instanceof File) {
    formData.append("avatar", payload.avatar);
  }

  return api.post("/profile/update", formData);
}

export async function changePassword(payload) {
  return api.put('/profile/change-password', payload)
}


export default api
