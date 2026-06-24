import { logout } from '../logout.js'
import { AUTH_TOKEN_STORAGE_KEY } from '../tokenStorage.js'

describe('logout', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-to-clear')
    global.fetch = jest.fn()
    process.env.VITE_NAUTH_BASE_URL = 'https://nauth.example.com'
    process.env.VITE_NAUTH_FRONTEND_URL = 'https://login.example.com'
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('calls nAuth logout with credentials include and clears token', async () => {
    global.fetch.mockResolvedValue({ ok: true })

    await logout()

    expect(global.fetch).toHaveBeenCalledWith(
      'https://nauth.example.com/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include'
      })
    )
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  test('clears token even if nAuth logout fails', async () => {
    process.env.VITE_NAUTH_FRONTEND_URL = ''
    global.fetch.mockRejectedValue(new Error('network error'))

    await logout()

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
  })
})
