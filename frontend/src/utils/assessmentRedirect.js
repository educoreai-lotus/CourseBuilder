const DEFAULT_ASSESSMENT_INTRO_URL = 'https://assessment-seven-liard.vercel.app/exam-intro'

function isValidHttpUrl(value) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return false
  }

  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function appendPostcourseParams(url, courseId) {
  const parsed = new URL(url)
  parsed.searchParams.set('examType', 'postcourse')
  if (courseId) {
    parsed.searchParams.set('courseId', String(courseId))
  }
  return parsed.toString()
}

export function appendAccessTokenHash(url, token) {
  if (!token || String(token).trim() === '') {
    throw new Error('Missing access token for Assessment redirect')
  }

  const separator = url.includes('#') ? '&' : '#'
  return `${url}${separator}access_token=${encodeURIComponent(String(token).trim())}`
}

export function resolveAssessmentBaseUrl(redirectUrl, envFrontendUrl) {
  if (isValidHttpUrl(redirectUrl)) {
    return redirectUrl.trim()
  }

  const normalizedEnv = typeof envFrontendUrl === 'string' ? envFrontendUrl.trim().replace(/\/+$/, '') : ''
  if (normalizedEnv) {
    return `${normalizedEnv}/exam-intro`
  }

  return `${DEFAULT_ASSESSMENT_INTRO_URL}?examType=postcourse`
}

export function buildAssessmentPostcourseRedirectUrl({ redirectUrl, envFrontendUrl, courseId, token }) {
  const baseUrl = resolveAssessmentBaseUrl(redirectUrl, envFrontendUrl)
  const withParams = appendPostcourseParams(baseUrl, courseId)
  return appendAccessTokenHash(withParams, token)
}
