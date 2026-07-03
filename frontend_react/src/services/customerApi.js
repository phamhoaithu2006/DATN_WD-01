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
  const endpoint = params.keyword || params.destination_id || params.start_date || params.guests
    ? '/tours/search'
    : '/tours'
  const response = await api.get(endpoint, { params })

  return response.data?.data || []
}

export async function fetchTourDetail(slug) {
  const response = await api.get(`/tours/${encodeURIComponent(slug)}`)

  return response.data?.data || null
}

export async function filterTours(params = {}) {
  const response = await api.get('/tours/filter', { params })

  return response.data?.data || []
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
  return api.put('/profile/update', payload)
}

export async function changePassword(payload) {
  return api.put('/profile/change-password', payload)
}

export default api
