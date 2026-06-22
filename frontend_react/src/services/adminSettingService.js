import axios from 'axios'
import { readToken } from './authStorage'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/admin'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = readToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export async function getAdminSettings() {
  const { data } = await api.get('/settings')
  return data.data || {}
}

export async function updateAdminSettings(payload) {
  const { data } = await api.put('/settings', payload)
  return data.data || {}
}
