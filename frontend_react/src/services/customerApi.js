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

export async function fetchCatalogDestinations(params = {}) {
  const response = await api.get('/catalog/destinations', { params })

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

  console.log('RAW /profile/bookings:', response.data)

  const payload = response.data?.data ?? response.data

  const bookings = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : []

  console.table(
    bookings.map((booking) => ({
      id: booking.id,
      booking_code: booking.booking_code,
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: booking.payment?.payment_method,
      payment_state: booking.payment?.status,
      expires_at: booking.payment?.expires_at,
      departure_date: booking.tour_departure?.departure_date,
      return_date: booking.tour_departure?.return_date,
    })),
  )

  return bookings
}

export async function fetchActivePendingBooking(tourId) {
  const response = await api.get('/customer/bookings/active-pending', {
    params: { tour_id: tourId },
  })

  return response.data?.data || null
}

export async function previewCustomerBooking(payload) {
  const response = await api.post('/customer/bookings/preview', payload)

  return response.data?.data || null
}

export async function createCustomerBooking(payload, idempotencyKey) {
  const response = await api.post('/customer/bookings', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  })

  return response.data?.data || response.data
}

export async function continueCustomerBookingPayment(bookingId) {
  const response = await api.post(`/customer/bookings/${bookingId}/continue-payment`)

  return response.data?.data || response.data
}

// `reason` là bắt buộc phía backend (dùng để lưu vào lịch sử booking_status_histories).
export async function cancelCustomerBooking(bookingId, reason) {
  const response = await api.patch(`/customer/bookings/${bookingId}/cancel`, { reason })

  return response.data?.data || response.data
}

// Sửa thông tin liên hệ sau khi đã đặt tour (chỉ khi đơn chưa khởi hành/hoàn thành/hủy).
export async function updateBookingContact(bookingId, payload) {
  const response = await api.patch(`/customer/bookings/${bookingId}/contact`, payload)

  return response.data?.data || response.data
}

// Sửa thông tin hành khách (không sửa được ngày sinh vì ảnh hưởng đến giá vé).
// payload: { participants: [{ id, full_name, phone, gender, identity_number }] }
export async function updateBookingParticipants(bookingId, payload) {
  const response = await api.patch(`/customer/bookings/${bookingId}/participants`, payload)

  return response.data?.data || response.data
}

// ===========================
// XỬ LÝ SỰ CỐ MƯA BÃO (hoàn tiền / bảo lưu / đổi tour)
// ===========================

export async function fetchDisruptionRequests(params = {}) {
  const response = await api.get('/customer/disruption-requests', { params })

  return response.data?.data || null
}

// payload: { type: 'refund', reason }
export async function createDisruptionRequest(bookingId, payload) {
  const response = await api.post(`/customer/bookings/${bookingId}/disruption-requests`, payload)

  return response.data?.data || response.data
}

export async function updateCustomerBookingInformation(bookingId, payload) {
  const response = await api.patch(`/customer/bookings/${bookingId}/information`, payload)

  return response.data?.data || response.data
}

export async function fetchVnpayPaymentStatus(paymentId) {
  const response = await api.get(`/customer/payments/vnpay/${paymentId}`)

  return response.data?.data || response.data
}

export async function withdrawDisruptionRequest(requestId) {
  const response = await api.delete(`/customer/booking-disruption-requests/${requestId}`)

  return response.data?.data || response.data
}

export async function cancelVnpayPayment(paymentId) {
  const response = await api.patch(`/customer/payments/vnpay/${paymentId}/cancel`)

  return response.data?.data || response.data
}

export async function fetchVnpayReturnStatus(params) {
  const response = await api.get('/vnpay/return-status', { params })

  return response.data?.data || response.data
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null

  const number = Number(value)
  return Number.isFinite(number) ? number : null
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

    const durationDays = toOptionalNumber(tour.duration_days)
    const durationNights = toOptionalNumber(tour.duration_nights)

    return [{
      id,
      slug,
      title,
      thumbnailUrl:
        typeof tour.thumbnail_url === 'string' ? tour.thumbnail_url.trim() : '',
      thumbnailAlt:
        typeof tour.thumbnail_alt === 'string' ? tour.thumbnail_alt.trim() : '',
      destination:
        typeof tour.destination === 'string' ? tour.destination.trim() : '',
      durationDays,
      durationNights,
      duration:
        typeof tour.duration === 'string' ? tour.duration.trim() : '',
      basePrice: toOptionalNumber(tour.base_price),
      discountPrice: toOptionalNumber(tour.discount_price),
      price: toOptionalNumber(tour.price),
      departureDate:
        typeof tour.departure_date === 'string' ? tour.departure_date : null,
      averageRating: toOptionalNumber(tour.average_rating),
      reviewCount: toOptionalNumber(tour.review_count),
    }]
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

export async function closeChatSession(sessionId) {
  const response = await api.post('/travel-assistant/close', {
    session_id: sessionId,
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
