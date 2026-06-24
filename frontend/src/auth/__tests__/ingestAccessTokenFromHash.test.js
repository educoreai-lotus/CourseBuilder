import { ingestAccessTokenFromHash } from '../ingestAccessTokenFromHash.js'
import { AUTH_TOKEN_STORAGE_KEY } from '../tokenStorage.js'

describe('ingestAccessTokenFromHash', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/learner/dashboard')
    window.history.replaceState = jest.fn()
  })

  test('stores access_token and strips hash', () => {
    window.location.hash = '#access_token=test-jwt-token'

    ingestAccessTokenFromHash()

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('test-jwt-token')
    expect(window.history.replaceState).toHaveBeenCalled()
  })

  test('does nothing when hash is missing', () => {
    window.location.hash = ''

    ingestAccessTokenFromHash()

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })
})
