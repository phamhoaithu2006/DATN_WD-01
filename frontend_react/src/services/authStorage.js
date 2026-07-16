export const SESSION_KEY = 'skytrail_session'
export const TOKEN_KEY = 'skytrail_token'
const DEPRECATED_TOKEN_KEYS = ['token', 'admin_token', 'access_token', 'auth_token', 'authToken']

export function normalizeSessionUser(user) {
  if (!user) return null

  const roleName =
    typeof user.role === 'string'
      ? user.role
      : user.role?.name || user.role_name || ''

  return {
    ...user,
    full_name: user.full_name || user.name || user.email || '',
    email: user.email || '',
    phone: user.phone || '',
    role: roleName,
    role_detail:
      typeof user.role === 'object' && user.role !== null
        ? user.role
        : user.role_detail || null,
  }
}

export function readSession() {
  try {
    return normalizeSessionUser(
      JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)),
    )
  } catch {
    return null
  }
}

export function saveSession(user, remember = true) {
  const storage = remember ? localStorage : sessionStorage
  const otherStorage = remember ? sessionStorage : localStorage

  otherStorage.removeItem(SESSION_KEY)
  storage.setItem(SESSION_KEY, JSON.stringify(normalizeSessionUser(user)))
}

export function readToken() {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY) ||
    null
  )
}

export function saveToken(token, remember = true) {
  const storage = remember ? localStorage : sessionStorage
  const otherStorage = remember ? sessionStorage : localStorage

  otherStorage.removeItem(TOKEN_KEY)
  storage.setItem(TOKEN_KEY, token)
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(TOKEN_KEY)

  DEPRECATED_TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}
