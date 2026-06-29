import {
  appendPostcourseParams,
  appendAccessTokenHash,
  resolveAssessmentBaseUrl,
  buildAssessmentPostcourseRedirectUrl
} from '../assessmentRedirect.js'

const COURSE_ID = '11111111-1111-1111-1111-111111111111'
const TOKEN = 'dummy.jwt.token'

describe('appendPostcourseParams', () => {
  test('sets examType=postcourse and courseId', () => {
    const url = appendPostcourseParams('https://assessment.example.com/exam-intro', COURSE_ID)

    expect(url).toContain('examType=postcourse')
    expect(url).toContain(`courseId=${COURSE_ID}`)
    expect(url).not.toContain('learner_id')
  })
})

describe('appendAccessTokenHash', () => {
  test('appends encoded token in hash fragment', () => {
    const url = appendAccessTokenHash(
      'https://assessment.example.com/exam-intro?examType=postcourse',
      TOKEN
    )

    const parsed = new URL(url)
    expect(parsed.hash).toBe(`#access_token=${encodeURIComponent(TOKEN)}`)
    expect(parsed.searchParams.has('access_token')).toBe(false)
  })

  test('throws when token is missing', () => {
    expect(() =>
      appendAccessTokenHash('https://assessment.example.com/exam-intro', '')
    ).toThrow('Missing access token for Assessment redirect')
  })
})

describe('resolveAssessmentBaseUrl', () => {
  test('prefers backend redirect_url when valid', () => {
    const redirect = 'https://assessment.example.com/exam-intro?examType=postcourse'

    expect(resolveAssessmentBaseUrl(redirect, 'https://other.example.com')).toBe(redirect)
  })

  test('uses env frontend URL when redirect_url is absent', () => {
    expect(resolveAssessmentBaseUrl(null, 'https://assessment.example.com/')).toBe(
      'https://assessment.example.com/exam-intro'
    )
  })

  test('falls back to legacy hardcoded intro URL', () => {
    expect(resolveAssessmentBaseUrl(null, '')).toBe(
      'https://assessment-seven-liard.vercel.app/exam-intro?examType=postcourse'
    )
  })
})

describe('buildAssessmentPostcourseRedirectUrl', () => {
  test('builds postcourse redirect with backend redirect_url and token hash', () => {
    const url = buildAssessmentPostcourseRedirectUrl({
      redirectUrl: 'https://assessment.example.com/exam-intro',
      envFrontendUrl: '',
      courseId: COURSE_ID,
      token: TOKEN
    })

    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://assessment.example.com/exam-intro')
    expect(parsed.searchParams.get('examType')).toBe('postcourse')
    expect(parsed.searchParams.get('courseId')).toBe(COURSE_ID)
    expect(parsed.hash).toBe(`#access_token=${encodeURIComponent(TOKEN)}`)
    expect(parsed.searchParams.has('access_token')).toBe(false)
    expect(url).not.toContain('learner_id')
  })

  test('uses env frontend URL when redirect_url is absent', () => {
    const url = buildAssessmentPostcourseRedirectUrl({
      redirectUrl: null,
      envFrontendUrl: 'https://assessment.example.com',
      courseId: COURSE_ID,
      token: TOKEN
    })

    expect(url).toContain('https://assessment.example.com/exam-intro')
    expect(url).toContain('examType=postcourse')
    expect(url).toContain(`courseId=${COURSE_ID}`)
    expect(url).toContain('#access_token=')
  })

  test('throws when token is missing so redirect is not built', () => {
    expect(() =>
      buildAssessmentPostcourseRedirectUrl({
        redirectUrl: 'https://assessment.example.com/exam-intro',
        envFrontendUrl: '',
        courseId: COURSE_ID,
        token: ''
      })
    ).toThrow('Missing access token for Assessment redirect')
  })
})
