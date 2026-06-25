import {
  logout,
  callNAuthLogout,
  clearCourseBuilderAuthState,
  redirectToNAuthLogin,
  getNAuthLoginUrl,
  navigation
} from '../logout.js'
import { AUTH_TOKEN_STORAGE_KEY } from '../tokenStorage.js'

describe('callNAuthLogout', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    process.env.VITE_NAUTH_BASE_URL = 'https://nauth.example.com/'
  })

  test('POSTs to nAuth logout without Authorization header or body', async () => {
    global.fetch.mockResolvedValue({ ok: true })

    await callNAuthLogout()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('https://nauth.example.com/auth/logout')
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('include')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(options.body).toBeUndefined()
    expect(options.headers.Authorization).toBeUndefined()
  })

  test('throws when nAuth responds with non-ok status', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 })

    await expect(callNAuthLogout()).rejects.toThrow('nAuth logout failed with status 500')
  })
})

describe('clearCourseBuilderAuthState', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'jwt-secret')
    localStorage.setItem('authToken', 'legacy')
    localStorage.setItem('accessToken', 'legacy')
    localStorage.setItem('token', 'legacy')
    localStorage.setItem('user_id', 'dir-user-1')
    localStorage.setItem('coursebuilder:userRole', 'learner')
  })

  test('clears auth token and legacy identity keys', () => {
    clearCourseBuilderAuthState()

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user_id')).toBeNull()
    expect(localStorage.getItem('coursebuilder:userRole')).toBeNull()
  })
})

describe('getNAuthLoginUrl', () => {
  test('builds nAuth frontend login URL from env', () => {
    process.env.VITE_NAUTH_FRONTEND_URL = 'https://login.example.com/'

    expect(getNAuthLoginUrl()).toBe('https://login.example.com/login')
  })
})

describe('redirectToNAuthLogin', () => {
  beforeEach(() => {
    process.env.VITE_NAUTH_FRONTEND_URL = 'https://login.example.com/'
    jest.spyOn(navigation, 'redirect').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('redirects to nAuth frontend login URL', () => {
    redirectToNAuthLogin()

    expect(navigation.redirect).toHaveBeenCalledWith('https://login.example.com/login')
  })
})

describe('logout', () => {
  const consoleError = console.error
  let redirectedTo

  beforeEach(() => {
    redirectedTo = undefined
    localStorage.clear()
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'token-to-clear')
    localStorage.setItem('user_id', 'dir-user-1')
    localStorage.setItem('coursebuilder:userRole', 'learner')
    global.fetch = jest.fn()
    process.env.VITE_NAUTH_BASE_URL = 'https://nauth.example.com'
    process.env.VITE_NAUTH_FRONTEND_URL = 'https://login.example.com'
    console.error = jest.fn()
    jest.spyOn(navigation, 'redirect').mockImplementation((url) => {
      redirectedTo = url
    })
  })

  afterEach(() => {
    console.error = consoleError
    jest.restoreAllMocks()
  })

  test('calls nAuth logout, clears storage, and redirects to login', async () => {
    global.fetch.mockResolvedValue({ ok: true })

    await logout()

    expect(global.fetch).toHaveBeenCalledWith(
      'https://nauth.example.com/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
    )
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('user_id')).toBeNull()
    expect(localStorage.getItem('coursebuilder:userRole')).toBeNull()
    expect(redirectedTo).toBe('https://login.example.com/login')
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('jwt'),
      expect.anything()
    )
  })

  test('clears local auth and redirects when nAuth logout fails', async () => {
    global.fetch.mockRejectedValue(new Error('network error'))

    await logout()

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('user_id')).toBeNull()
    expect(redirectedTo).toBe('https://login.example.com/login')
    expect(console.error).toHaveBeenCalledWith(
      '[CourseBuilder Logout] nAuth logout failed; clearing local auth state anyway',
      expect.any(Error)
    )
  })

  test('does not log token values', async () => {
    global.fetch.mockResolvedValue({ ok: true })

    await logout()

    const errorCalls = console.error.mock.calls.flat().join(' ')
    expect(errorCalls).not.toContain('token-to-clear')
  })
})
