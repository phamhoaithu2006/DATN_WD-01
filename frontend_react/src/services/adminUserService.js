import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
})

export async function getUsers(params = {}) {
  const { data } = await api.get('/customers', { params })
  return data.data || []
}

export async function getUserCount() {
  const { data } = await api.get('/customers/count')
  return data.total || 0
}

export async function getUserDetail(id) {
  const { data } = await api.get(`/customers/${id}`)
  return data.data
}

export async function createUser(payload) {
  const { data } = await api.post('/customers', payload)
  return data.data
}

export async function updateUser(id, payload) {
  const { data } = await api.put(`/customers/${id}`, payload)
  return data.data
}

export async function lockUser(id) {
  const { data } = await api.patch(`/customers/${id}/lock`)
  return data
}

export async function unlockUser(id) {
  const { data } = await api.patch(`/customers/${id}/unlock`)
  return data
}