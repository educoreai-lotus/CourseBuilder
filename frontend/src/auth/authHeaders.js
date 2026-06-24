import { getAuthToken } from './tokenStorage.js'

export function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders }
  const token = getAuthToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}
