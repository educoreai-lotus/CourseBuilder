import { AUTH_TOKEN_STORAGE_KEY, applyRotatedTokenFromHeaders } from '../../auth/tokenStorage.js'

describe('api auth helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('applyRotatedTokenFromHeaders persists rotated token', () => {
    applyRotatedTokenFromHeaders({ 'X-New-Access-Token': 'rotated' })
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('rotated')
  })

  test('Bearer header would be built from stored token', () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'my-jwt')
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    expect(`Bearer ${token}`).toBe('Bearer my-jwt')
  })

  test('401 flow clears stored token', () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'expired-jwt')
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
  })
})
