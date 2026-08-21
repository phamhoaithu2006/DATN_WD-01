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
    const storedSession = sessionStorage.getItem(SESSION_KEY)

    return normalizeSessionUser(
      JSON.parse(storedSession),
    )
  } catch {
    return null
  }
}

export function saveSession(user, remember = true) {
  void remember
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(normalizeSessionUser(user)))
}

export function readToken() {
  return sessionStorage.getItem(TOKEN_KEY) || null
}

export function saveToken(token, remember = true) {
  void remember
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(TOKEN_KEY)

  DEPRECATED_TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}
