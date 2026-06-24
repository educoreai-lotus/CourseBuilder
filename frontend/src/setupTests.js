import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { jest } from '@jest/globals'

globalThis.jest = jest

process.env.VITE_API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api/v1'
process.env.VITE_NAUTH_BASE_URL = process.env.VITE_NAUTH_BASE_URL || 'https://nauth.example.com'
process.env.VITE_NAUTH_FRONTEND_URL = process.env.VITE_NAUTH_FRONTEND_URL || 'https://login.example.com'

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}
