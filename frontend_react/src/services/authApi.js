import apiClient from './apiClient'

export async function login(email, password, remember = false) {
  const response = await apiClient.post('/auth/login', { email, password, remember })
  return response.data
}

export async function register(payload) {
  const response = await apiClient.post('/auth/register', payload)
  return response.data
}

export async function logout() {
  await apiClient.post('/auth/logout')
}
