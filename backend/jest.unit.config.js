import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Jest config without PostgreSQL globalSetup (unit / HTTP isolation tests). */
export default {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/learnerIsolation.test.js', '**/__tests__/authentication.test.js'],
  setupFilesAfterEnv: [path.join(__dirname, 'jest.setup.js')],
  transform: {}
};
