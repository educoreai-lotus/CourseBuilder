import { getAuthToken } from './tokenStorage.js'

/**
 * Initialize Educore bot only when a real JWT is present.
 * Never pass mock userProfile.id as token.
 * @returns {boolean} true when bot initialization was invoked
 */
export function initializeEducoreBotIfAuthenticated(userId) {
  const authToken = getAuthToken()
  if (!authToken || !userId) {
    return false
  }

  if (typeof window.initializeEducoreBot !== 'function') {
    return false
  }

  window.initializeEducoreBot({
    microservice: 'COURSE_BUILDER',
    userId,
    token: authToken,
    tenantId: 'default'
  })

  return true
}
