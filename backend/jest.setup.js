import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.AUTH_DISABLED = process.env.AUTH_DISABLED || 'true';
jest.setTimeout(30000);

// Mock fetch globally if not already available (for coordinatorClient tests)
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = jest.fn();
}
if (typeof global.fetch === 'undefined') {
  global.fetch = globalThis.fetch;
}
