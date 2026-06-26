import axios from 'axios'
import { clearSession, readToken } from './authStorage'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = readToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const isAuthPage = window.location.pathname === '/auth'
    const isAdminPage = window.location.pathname.startsWith('/admin')

    if (status === 401 && !isAuthPage) {
      clearSession()
      window.location.assign('/auth')
    }

    if (status === 403 && isAdminPage) {
      window.location.assign('/auth')
    }

    return Promise.reject(error)
  },
)

export default apiClient
