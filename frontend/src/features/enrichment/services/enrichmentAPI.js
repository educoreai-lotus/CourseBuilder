import {
  getAuthToken,
  applyRotatedTokenFromHeaders,
  clearAuthToken
} from '../../../auth/tokenStorage.js'
import { getApiUrl, getNauthFrontendUrl } from '../../../config/env.js'

const resolveEndpoint = () => {
  const defaultPath = '/api/enrichment/assets'
  const raw = getApiUrl()

  if (!raw) {
    return defaultPath
  }

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const url = new URL(raw, base)
    const pathname = url.pathname.replace(/\/$/, '')
    const apiRoot = pathname.endsWith('/api/v1') ? pathname.slice(0, -'/api/v1'.length) : pathname
    const nextPath = `${apiRoot}/api/enrichment/assets`.replace(/\/{2,}/g, '/')
    url.pathname = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
    return url.toString()
  } catch (error) {
    console.warn('Failed to resolve enrichment endpoint from API URL, falling back to relative path.', error)
    return defaultPath
  }
}

const ENRICHMENT_ENDPOINT = resolveEndpoint()

const redirectToSignIn = () => {
  if (typeof window === 'undefined' || window.location.pathname === '/sign-in-required') {
    return
  }
  const loginUrl = getNauthFrontendUrl()
  if (loginUrl) {
    window.location.href = `${loginUrl.replace(/\/+$/, '')}/login`
    return
  }
  window.location.href = '/sign-in-required'
}

export const enrichAssets = async (assetData = {}) => {
  try {
    const headers = {
      'Content-Type': 'application/json'
    }

    const token = getAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(ENRICHMENT_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(assetData)
    })

    applyRotatedTokenFromHeaders(response.headers)

    if (response.status === 401) {
      clearAuthToken()
      redirectToSignIn()
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      let errorMessage = 'Failed to enrich assets'
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        const errorText = await response.text().catch(() => '')
        errorMessage = errorText || errorMessage
      }
      const error = new Error(errorMessage)
      error.status = response.status
      throw error
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network error: Unable to connect to enrichment service')
  }
}

export default {
  enrichAssets
}
