import { ingestAccessTokenFromHash, parseAccessTokenFromHash } from '../ingestAccessTokenFromHash.js'
import { AUTH_TOKEN_STORAGE_KEY } from '../tokenStorage.js'

describe('parseAccessTokenFromHash', () => {
  test('parses #access_token=dummy.jwt.token', () => {
    expect(parseAccessTokenFromHash('#access_token=dummy.jwt.token')).toBe('dummy.jwt.token')
  })

  test('parses access_token with trailing params', () => {
    expect(parseAccessTokenFromHash('#access_token=dummy.jwt.token&token_type=Bearer')).toBe(
      'dummy.jwt.token'
    )
  })

  test('returns null when hash is empty', () => {
    expect(parseAccessTokenFromHash('')).toBeNull()
    expect(parseAccessTokenFromHash('#')).toBeNull()
  })
})

describe('ingestAccessTokenFromHash', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/learner/dashboard')
    window.history.replaceState = jest.fn()
  })

  test('stores access_token and strips hash', () => {
    window.location.hash = '#access_token=dummy.jwt.token'

    const saved = ingestAccessTokenFromHash()

    expect(saved).toBe(true)
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('dummy.jwt.token')
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      document.title,
      '/learner/dashboard'
    )
  })

  test('supports /learner/dashboard/#access_token=dummy.jwt.token', () => {
    window.history.replaceState({}, '', '/learner/dashboard/')
    window.location.hash = '#access_token=dummy.jwt.token'

    const saved = ingestAccessTokenFromHash()

    expect(saved).toBe(true)
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('dummy.jwt.token')
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      document.title,
      '/learner/dashboard/'
    )
  })

  test('does nothing when hash is missing', () => {
    window.location.hash = ''

    const saved = ingestAccessTokenFromHash()

    expect(saved).toBe(false)
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })

  test('does not strip hash when access_token is absent', () => {
    window.location.hash = '#other=value'

    const saved = ingestAccessTokenFromHash()

    expect(saved).toBe(false)
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })
})
