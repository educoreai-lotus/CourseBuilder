import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.AUTH_DISABLED = process.env.AUTH_DISABLED || 'true';
jest.setTimeout(30000);
