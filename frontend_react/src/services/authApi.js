import apiClient from './apiClient'
import { readToken } from './authStorage'

export async function login(identifier, password, remember = false) {
  const response = await apiClient.post('/auth/login', {
    identifier,
    password,
    remember,
  })

  const data = response.data

  const token =
    data?.token ||
    data?.access_token ||
    data?.data?.token ||
    data?.data?.access_token

  if (!token) {
    throw new Error('Đăng nhập thành công nhưng API không trả về token.')
  }

  return data
}

export async function register(payload) {
  const response = await apiClient.post('/auth/register', payload)
  return response.data
}

export async function logout(token = readToken()) {
  if (token) {
    await apiClient.post('/auth/logout', null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000,
    })
  }
}

export async function forgotPassword(identifier) {
  const response = await apiClient.post('/auth/forgot-password', { identifier })
  return response.data
}

export async function resetPassword(payload) {
  // payload: { identifier, otp, password, password_confirmation }
  const response = await apiClient.post('/auth/reset-password', payload)
  return response.data
}
