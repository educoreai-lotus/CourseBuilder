import { setAuthToken } from './tokenStorage.js'

/**
 * Read access_token from URL hash (Directory handoff) and persist before React boot.
 */
export function ingestAccessTokenFromHash() {
  if (typeof window === 'undefined') {
    return
  }

  const hash = window.location.hash
  if (!hash || hash.length <= 1) {
    return
  }

  try {
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    const accessToken = params.get('access_token')

    if (accessToken && accessToken.trim()) {
      setAuthToken(accessToken.trim())
    }

    const cleanUrl = `${window.location.pathname}${window.location.search}`
    window.history.replaceState({}, document.title, cleanUrl)
  } catch {
    // Ignore malformed hash; do not block app startup
  }
}
