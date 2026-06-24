import { setAuthToken } from './tokenStorage.js'

/**
 * Parse Directory handoff hash fragments:
 * - #access_token=<JWT>
 * - /learner/dashboard#access_token=<JWT>
 * - /learner/dashboard/#access_token=<JWT>
 */
export function parseAccessTokenFromHash(hash) {
  if (!hash || hash.length <= 1) {
    return null
  }

  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const prefix = 'access_token='
  const prefixIndex = raw.indexOf(prefix)

  if (prefixIndex !== -1) {
    const value = raw.slice(prefixIndex + prefix.length)
    const ampersandIndex = value.indexOf('&')
    const token = (ampersandIndex === -1 ? value : value.slice(0, ampersandIndex)).trim()
    if (token) {
      try {
        return decodeURIComponent(token)
      } catch {
        return token
      }
    }
  }

  try {
    const fromParams = new URLSearchParams(raw).get('access_token')
    return fromParams?.trim() || null
  } catch {
    return null
  }
}

/**
 * Read access_token from URL hash (Directory handoff) and persist before React boot.
 * Idempotent second pass after the inline head bootstrap in index.html.
 * @returns {boolean} true when a token was saved
 */
export function ingestAccessTokenFromHash() {
  if (typeof window === 'undefined') {
    return false
  }

  const accessToken = parseAccessTokenFromHash(window.location.hash)
  if (!accessToken) {
    return false
  }

  setAuthToken(accessToken)

  const cleanUrl = `${window.location.pathname}${window.location.search}`
  window.history.replaceState({}, document.title, cleanUrl)
  return true
}
