import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Jest config without PostgreSQL globalSetup (unit / controller tests). */
export default {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/learnerProgressIsolation.test.js',
    '**/__tests__/learnerDataIsolation.test.js',
    '**/__tests__/learnerFlowAuthorization.test.js',
    '**/__tests__/assessmentLearnerIsolation.test.js',
    '**/__tests__/coordinatorRequestAuth.test.js',
    '**/__tests__/publicRoutes.test.js',
    '**/__tests__/authContext.test.js',
    '**/__tests__/postcourseCompletion.test.js',
    '**/__tests__/personalizedLessonPlacement.test.js',
    '**/__tests__/learnerAIHandler.personalized.test.js',
    '**/__tests__/personalizedAsyncGeneration.accept.test.js',
    '**/__tests__/personalizedGeneration.fencing.test.js',
    '**/__tests__/personalizedGeneration.pipeline.test.js',
    '**/__tests__/personalizedGeneration.readiness.test.js',
    '**/__tests__/personalizedGeneration.jobRepository.test.js',
    '**/__tests__/personalizedGeneration.blockers.test.js',
    '**/__tests__/coordinatorClient.test.js',
    '**/__tests__/railwayTimeoutDiagnostic.test.js'
  ],
  setupFilesAfterEnv: [path.join(__dirname, 'jest.setup.js')],
  transform: {}
};
