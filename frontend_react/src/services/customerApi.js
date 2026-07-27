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

// Danh sách tour kèm meta phân trang, hỗ trợ hủy request (AbortController).
export async function fetchToursWithMeta(params = {}, signal) {
  const response = await api.get("/tours", { params, signal });

  return {
    items: response.data?.data || [],
    meta: response.data?.meta || null,
  };
}

// Metadata dựng UI bộ lọc: khoảng giá, điểm đến, danh mục, bucket thời lượng.
export async function fetchTourFilterOptions() {
  const response = await api.get("/tours/filter-options");

  return response.data?.data || null;
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

export function normalizeRecommendedTours(value) {
  if (!Array.isArray(value)) return []

  const seenIds = new Set()
  const seenSlugs = new Set()

  return value.flatMap((tour) => {
    const id = Number(tour?.id)
    const slug = typeof tour?.slug === 'string' ? tour.slug.trim() : ''
    const title = typeof tour?.title === 'string' ? tour.title.trim() : ''

    if (!Number.isInteger(id) || id <= 0 || !slug || !title) return []
    if (seenIds.has(id) || seenSlugs.has(slug)) return []

    seenIds.add(id)
    seenSlugs.add(slug)

    return [{ id, slug, title }]
  }).slice(0, 10)
}

function normalizeTravelAssistantResponse(response) {
  const payload = response.data?.data || response.data || {}

  return {
    ...payload,
    recommended_tours: normalizeRecommendedTours(payload.recommended_tours),
  }
}

export async function askTravelAssistant(message, sessionId, requestHuman = false, imageFile = null) {
  if (imageFile) {
    const formData = new FormData()
    if (message) formData.append('message', message)
    formData.append('session_id', sessionId)
    formData.append('request_human', requestHuman ? '1' : '0')
    formData.append('image', imageFile)

    const response = await api.post('/travel-assistant', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return normalizeTravelAssistantResponse(response)
  }

  const response = await api.post('/travel-assistant', {
    message,
    session_id: sessionId,
    request_human: requestHuman,
  })

  return normalizeTravelAssistantResponse(response)
}
export async function fetchChatMessages(sessionId) {
  const response = await api.get('/travel-assistant/messages', {
    params: { session_id: sessionId },
  })

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
export async function fetchGuideReviewableBookings(params = {}) {
  const response = await api.get("/customer/guide-reviewable-bookings", {
    params: {
      per_page: 50,
      ...params,
    },
  });

  return response.data?.data?.data || [];
}

export async function submitGuideReview(payload) {
  const response = await api.post("/customer/guide-reviews", payload);

  return response.data?.data || response.data;
}

export default api
