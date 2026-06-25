import { clearAuthToken } from './tokenStorage.js'
import { getNauthBaseUrl, getNauthFrontendUrl } from '../config/env.js'

const ROLE_STORAGE_KEY = 'coursebuilder:userRole'

const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '')

function requireNAuthBaseUrl() {
  const baseUrl = stripTrailingSlash(getNauthBaseUrl())
  if (!baseUrl) {
    throw new Error('VITE_NAUTH_BASE_URL is not configured')
  }
  return baseUrl
}

function requireNAuthFrontendUrl() {
  const frontendUrl = stripTrailingSlash(getNauthFrontendUrl())
  if (!frontendUrl) {
    throw new Error('VITE_NAUTH_FRONTEND_URL is not configured')
  }
  return frontendUrl
}

export async function callNAuthLogout() {
  const baseUrl = requireNAuthBaseUrl()

  const response = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error(`nAuth logout failed with status ${response.status}`)
  }
}

export function clearCourseBuilderAuthState() {
  clearAuthToken()

  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem('user_id')
  window.localStorage.removeItem(ROLE_STORAGE_KEY)
}

export function getNAuthLoginUrl() {
  const frontendUrl = requireNAuthFrontendUrl()
  return `${frontendUrl}/login`
}

export const navigation = {
  redirect(url) {
    window.location.href = url
  }
}

export function redirectToNAuthLogin() {
  navigation.redirect(getNAuthLoginUrl())
}

export async function logout() {
  try {
    await callNAuthLogout()
  } catch (error) {
    console.error(
      '[CourseBuilder Logout] nAuth logout failed; clearing local auth state anyway',
      error
    )
  } finally {
    clearCourseBuilderAuthState()
    try {
      redirectToNAuthLogin()
    } catch (error) {
      console.error('[CourseBuilder Logout] redirect to nAuth login failed', error)
      navigation.redirect('/sign-in-required')
    }
  }
}
