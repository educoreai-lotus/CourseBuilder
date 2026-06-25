import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Jest config without PostgreSQL globalSetup (unit / controller tests). */
export default {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/learnerProgressIsolation.test.js',
    '**/__tests__/coordinatorRequestAuth.test.js',
    '**/__tests__/publicRoutes.test.js',
    '**/__tests__/authContext.test.js'
  ],
  setupFilesAfterEnv: [path.join(__dirname, 'jest.setup.js')],
  transform: {}
};
