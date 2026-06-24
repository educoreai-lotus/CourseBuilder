export const AUTH_TOKEN_STORAGE_KEY = 'auth_token'

const FALLBACK_TOKEN_KEYS = ['authToken', 'accessToken', 'token']

export function getAuthToken() {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') {
    return
  }
  if (!token || typeof token !== 'string' || !token.trim()) {
    return
  }
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token.trim())
}

export function clearAuthToken() {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  for (const key of FALLBACK_TOKEN_KEYS) {
    window.localStorage.removeItem(key)
  }
}

export function applyRotatedTokenFromHeaders(headers) {
  if (!headers) {
    return
  }

  const rotated =
    headers['x-new-access-token'] ||
    headers['X-New-Access-Token'] ||
    (typeof headers.get === 'function'
      ? headers.get('x-new-access-token') || headers.get('X-New-Access-Token')
      : null)

  if (rotated) {
    setAuthToken(rotated)
  }
}
