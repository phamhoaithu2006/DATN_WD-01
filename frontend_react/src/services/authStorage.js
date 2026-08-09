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
    const storedSession =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)

    // Migrate sessions created by older builds so newly opened tabs can use them.
    if (!localStorage.getItem(SESSION_KEY) && storedSession) {
      localStorage.setItem(SESSION_KEY, storedSession)
    }

    return normalizeSessionUser(
      JSON.parse(storedSession),
    )
  } catch {
    return null
  }
}

export function saveSession(user, remember = true) {
  void remember
  sessionStorage.removeItem(SESSION_KEY)
  localStorage.setItem(SESSION_KEY, JSON.stringify(normalizeSessionUser(user)))
}

export function readToken() {
  const token =
    localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null

  // Migrate the current tab's legacy session token for cross-tab authentication.
  if (!localStorage.getItem(TOKEN_KEY) && token) {
    localStorage.setItem(TOKEN_KEY, token)
  }

  return token
}

export function saveToken(token, remember = true) {
  void remember
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.setItem(TOKEN_KEY, token)
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
