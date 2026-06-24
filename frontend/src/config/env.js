/**
 * Runtime env access for Vite (build-time define) and Jest (process.env in setupTests).
 */
export function getEnv(key, fallback = '') {
  const value = process.env[key]
  if (value != null && value !== '') {
    return value
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
  return process.env.NODE_ENV !== 'production'
}
