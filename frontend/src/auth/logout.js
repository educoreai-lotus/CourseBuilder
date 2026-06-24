import { clearAuthToken } from './tokenStorage.js'
import { getNauthBaseUrl, getNauthFrontendUrl } from '../config/env.js'

export async function logout() {
  const nauthBase = getNauthBaseUrl()

  try {
    if (nauthBase) {
      await fetch(`${nauthBase.replace(/\/+$/, '')}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
    } else {
      console.warn('[logout] VITE_NAUTH_BASE_URL is not set; performing local logout only.')
    }
  } catch (error) {
    console.warn('[logout] nAuth logout request failed:', error)
  } finally {
    clearAuthToken()

    const loginUrl = getNauthFrontendUrl()
    if (loginUrl) {
      window.location.href = `${loginUrl.replace(/\/+$/, '')}/login`
    } else {
      window.location.href = '/sign-in-required'
    }
  }
}
