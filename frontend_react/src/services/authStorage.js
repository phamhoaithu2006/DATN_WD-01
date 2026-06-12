export const USERS_KEY = 'skytrail_users'
export const SESSION_KEY = 'skytrail_session'

export const demoUser = {
  name: 'Travel Explorer',
  email: 'demo@skytrail.vn',
  phone: '0901234567',
  password: 'Demo@123',
}

export function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY))
    return Array.isArray(users) && users.length > 0 ? users : [demoUser]
  } catch {
    return [demoUser]
  }
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}
