/**
 * Vite env access — each import.meta.env.* reference is inlined at build time.
 * process.env fallback is for Jest only (see setupTests.js).
 */
function readViteEnv(key) {
  switch (key) {
    case 'VITE_API_URL':
      return import.meta.env.VITE_API_URL
    case 'VITE_API_BASE_URL':
      return import.meta.env.VITE_API_BASE_URL
    case 'VITE_NAUTH_BASE_URL':
      return import.meta.env.VITE_NAUTH_BASE_URL
    case 'VITE_NAUTH_FRONTEND_URL':
      return import.meta.env.VITE_NAUTH_FRONTEND_URL
    default:
      return undefined
  }
}

export function getEnv(key, fallback = '') {
  let value = readViteEnv(key)

  if ((value == null || String(value).trim() === '') && typeof process !== 'undefined') {
    value = process.env[key]
  }

  if (value != null && String(value).trim() !== '') {
    return String(value).trim()
  }

  return fallback
}

export function getApiUrl() {
  return (
    getEnv('VITE_API_URL') ||
    getEnv('VITE_API_BASE_URL') ||
    'http://localhost:3000/api/v1'
  )
}

export function getNauthBaseUrl() {
  return getEnv('VITE_NAUTH_BASE_URL')
}

export function getNauthFrontendUrl() {
  return getEnv('VITE_NAUTH_FRONTEND_URL')
}

export function isDev() {
  if (import.meta.env.PROD) {
    return false
  }
  if (import.meta.env.DEV) {
    return true
  }
  return process.env.NODE_ENV !== 'production'
}
