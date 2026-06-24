import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.ENABLE_MOCK_AUTH = process.env.ENABLE_MOCK_AUTH || 'true';
delete process.env.AUTH_DISABLED;
jest.setTimeout(30000);

globalThis.jest = jest;

// Mock fetch globally if not already available (for coordinatorClient tests)
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = jest.fn();
}
if (typeof global.fetch === 'undefined') {
  global.fetch = globalThis.fetch;
}
