import { getApiUrl, getEnv, getNauthBaseUrl, getNauthFrontendUrl } from '../env.jest.js'
import { getBaseURL } from '../../services/apiService.js'

describe('env config', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('getApiUrl uses VITE_API_URL when set', () => {
    process.env.VITE_API_URL = 'https://coursebuilder-production.up.railway.app'
    delete process.env.VITE_API_BASE_URL

    expect(getApiUrl()).toBe('https://coursebuilder-production.up.railway.app')
  })

  test('getApiUrl falls back to VITE_API_BASE_URL', () => {
    delete process.env.VITE_API_URL
    process.env.VITE_API_BASE_URL = 'https://api.example.com'

    expect(getApiUrl()).toBe('https://api.example.com')
  })

  test('getApiUrl falls back to localhost only when both are missing', () => {
    delete process.env.VITE_API_URL
    delete process.env.VITE_API_BASE_URL

    expect(getApiUrl()).toBe('http://localhost:3000/api/v1')
  })

  test('getNauthBaseUrl reads VITE_NAUTH_BASE_URL', () => {
    process.env.VITE_NAUTH_BASE_URL = 'https://nauth.example.com'
    expect(getNauthBaseUrl()).toBe('https://nauth.example.com')
  })

  test('getNauthFrontendUrl reads VITE_NAUTH_FRONTEND_URL', () => {
    process.env.VITE_NAUTH_FRONTEND_URL = 'https://login.example.com'
    expect(getNauthFrontendUrl()).toBe('https://login.example.com')
  })

  test('getEnv trims whitespace values', () => {
    process.env.VITE_API_URL = '  https://api.example.com  '
    expect(getEnv('VITE_API_URL')).toBe('https://api.example.com')
  })
})

describe('getBaseURL', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('appends /api/v1 when host URL has no suffix', () => {
    process.env.VITE_API_URL = 'https://coursebuilder-production.up.railway.app'
    expect(getBaseURL()).toBe('https://coursebuilder-production.up.railway.app/api/v1')
  })

  test('does not double-append /api/v1', () => {
    process.env.VITE_API_URL = 'https://coursebuilder-production.up.railway.app/api/v1'
    expect(getBaseURL()).toBe('https://coursebuilder-production.up.railway.app/api/v1')
  })
})
