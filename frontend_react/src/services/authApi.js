import apiClient from './apiClient'

export async function login(email, password) {
  const response = await apiClient.post('/auth/login', { email, password })
  return response.data
}

export async function logout() {
  await apiClient.post('/auth/logout')
}
