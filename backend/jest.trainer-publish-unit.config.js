import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Trainer Publish + lesson-order unit tests without PostgreSQL globalSetup.
 * Full integration suites still use jest.config.js when a local test DB is available.
 */
export default {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/trainerPublishLessonOrder.test.js',
    '**/__tests__/trainerPublishFinalize.test.js',
    '**/__tests__/trainerPublishInit.test.js',
    '**/__tests__/trainerPublishChunk.test.js',
    '**/__tests__/trainerPublishIdempotencyRecovery.test.js',
    '**/__tests__/trainerPublishIntegrationHardening.test.js',
    '**/__tests__/compressedTrainerPublish.test.js'
  ],
  setupFilesAfterEnv: [path.join(__dirname, 'jest.setup.js')],
  transform: {}
};
