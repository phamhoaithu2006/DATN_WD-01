import axios from 'axios'
import { readSession } from './authStorage'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const session = readSession()
  const token = session?.token || session?.accessToken

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

export async function filterTours(params = {}) {
  const response = await api.get('/tours/filter', { params })

  return response.data?.data || []
}

export async function fetchWishlist() {
  const response = await api.get('/tours/wishlist')

  return response.data?.data || []
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
