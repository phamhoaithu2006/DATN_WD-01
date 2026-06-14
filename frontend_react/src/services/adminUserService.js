import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
})

export async function getUsers(params = {}) {
  const { data } = await api.get('/admin/users', { params })
  return data.data || []
}

export async function getUserStats() {
  const { data } = await api.get('/admin/users/stats')
  return data.data || []
}

export async function getRoles() {
  const { data } = await api.get('/admin/roles')
  return data.data || []
}

export async function getUserDetail(id) {
  const { data } = await api.get(`/admin/users/${id}`)
  return data.data
}

export async function createUser(payload) {
  const { data } = await api.post('/admin/users', payload)
  return data.data
}

export async function lockUser(id) {
  const { data } = await api.patch(`/admin/users/${id}/lock`)
  return data
}

export async function unlockUser(id) {
  const { data } = await api.patch(`/admin/users/${id}/unlock`)
  return data
}

export async function changeUserRole(id, roleId) {
  const { data } = await api.patch(`/admin/users/${id}/role`, { role_id: roleId })
  return data.data
}
