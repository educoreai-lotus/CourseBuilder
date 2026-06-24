import {
  AUTH_TOKEN_STORAGE_KEY,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  applyRotatedTokenFromHeaders
} from '../tokenStorage.js'

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('setAuthToken stores non-empty token under auth_token', () => {
    setAuthToken('  jwt-token  ')
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('jwt-token')
  })

  test('setAuthToken ignores empty tokens', () => {
    setAuthToken('')
    setAuthToken('   ')
    expect(getAuthToken()).toBeNull()
  })

  test('clearAuthToken removes auth_token and fallback keys', () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token')
    localStorage.setItem('authToken', 'old')
    localStorage.setItem('accessToken', 'old')
    localStorage.setItem('token', 'old')

    clearAuthToken()

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  test('applyRotatedTokenFromHeaders persists rotated token', () => {
    applyRotatedTokenFromHeaders({ 'X-New-Access-Token': 'rotated-jwt' })
    expect(getAuthToken()).toBe('rotated-jwt')
  })
})
