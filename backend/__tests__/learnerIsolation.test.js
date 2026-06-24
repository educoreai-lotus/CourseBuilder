import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import {
  assertLearnerMatchesAuthenticatedUser,
  getAuthenticatedLearnerId,
  isPersonalizedLearnerCourse,
  sendAuthIdentityError
} from '../utils/authHelpers.js';
import {
  getLearnerProgress,
  getMyLearnerProgress,
  registerForCourse,
  updateCourseProgress,
  getEnrollmentStatus
} from '../controllers/courses.controller.js';
import { coursesService } from '../services/courses.service.js';

const USER_X = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_Y = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const JASMINE_ID = '50a630f4-826e-45aa-8f70-653e5e592fc3';

function enableMockAuthWithoutCoordinator() {
  process.env.ENABLE_MOCK_AUTH = 'true';
  process.env.NODE_ENV = 'test';
  delete process.env.COORDINATOR_URL;
  delete process.env.COORDINATOR_API_URL;
}

function mockCoordinatorUser(directoryUserId, overrides = {}) {
  process.env.ENABLE_MOCK_AUTH = 'false';
  process.env.COORDINATOR_URL = 'https://coordinator.test';
  process.env.COORDINATOR_API_URL = 'https://coordinator.test';
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      response: {
        valid: true,
        directory_user_id: directoryUserId,
        organization_id: 'org-1',
        primary_role: 'EMPLOYEE',
        is_system_admin: false,
        is_trainer: false,
        ...overrides
      }
    })
  });
}

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send() {
      return this;
    }
  };
  return res;
}

describe('learner identity helpers', () => {
  it('getAuthenticatedLearnerId returns directoryUserId', () => {
    const req = { user: { directoryUserId: USER_X } };
    expect(getAuthenticatedLearnerId(req)).toBe(USER_X);
  });

  it('getAuthenticatedLearnerId throws 401 when missing', () => {
    expect(() => getAuthenticatedLearnerId({ user: {} })).toThrow(
      'Authenticated learner identity is missing'
    );
    try {
      getAuthenticatedLearnerId({ user: {} });
    } catch (error) {
      expect(error.status).toBe(401);
    }
  });

  it('assertLearnerMatchesAuthenticatedUser returns 403 on mismatch', () => {
    const req = { user: { directoryUserId: USER_X } };
    try {
      assertLearnerMatchesAuthenticatedUser(req, USER_Y);
    } catch (error) {
      expect(error.status).toBe(403);
      expect(error.message).toContain('learner mismatch');
    }
  });

  it('assertLearnerMatchesAuthenticatedUser allows matching id', () => {
    const req = { user: { directoryUserId: USER_X } };
    expect(assertLearnerMatchesAuthenticatedUser(req, USER_X)).toBe(USER_X);
    expect(assertLearnerMatchesAuthenticatedUser(req, undefined)).toBe(USER_X);
  });

  it('isPersonalizedLearnerCourse detects learner_specific courses', () => {
    expect(
      isPersonalizedLearnerCourse({
        course_type: 'learner_specific',
        learning_path_designation: {}
      })
    ).toBe(true);
    expect(
      isPersonalizedLearnerCourse({
        course_type: 'trainer',
        learning_path_designation: { personalized: true }
      })
    ).toBe(true);
    expect(
      isPersonalizedLearnerCourse({
        course_type: 'trainer',
        learning_path_designation: {}
      })
    ).toBe(false);
  });
});

describe('learner isolation controllers', () => {
  const originalRegister = coursesService.registerLearner;
  const originalProgress = coursesService.getLearnerProgress;
  const originalUpdate = coursesService.updateLessonProgress;
  const originalEnrollment = coursesService.getEnrollmentStatus;

  afterAll(() => {
    coursesService.registerLearner = originalRegister;
    coursesService.getLearnerProgress = originalProgress;
    coursesService.updateLessonProgress = originalUpdate;
    coursesService.getEnrollmentStatus = originalEnrollment;
  });

  it('getLearnerProgress returns 403 when path learnerId mismatches JWT user', async () => {
    const req = {
      params: { learnerId: USER_X },
      user: { directoryUserId: USER_Y, role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('forbidden');
    expect(next).not.toHaveBeenCalled();
  });

  it('getMyLearnerProgress uses authenticated learner id', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([{ course_id: 'c1' }]);
    const req = { user: { directoryUserId: USER_X, role: 'learner' } };
    const res = createMockRes();
    const next = jest.fn();

    await getMyLearnerProgress(req, res, next);

    expect(coursesService.getLearnerProgress).toHaveBeenCalledWith(USER_X);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ course_id: 'c1' }]);
  });

  it('registerForCourse stores registration under JWT user, not body learner_id', async () => {
    coursesService.registerLearner = jest.fn().mockResolvedValue({ id: 'reg-1' });
    const req = {
      params: { id: 'course-1' },
      body: { learner_id: JASMINE_ID, learner_name: 'Evil' },
      user: { directoryUserId: USER_X, role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await registerForCourse(req, res, next);

    expect(coursesService.registerLearner).toHaveBeenCalledWith(
      'course-1',
      expect.objectContaining({ learner_id: USER_X })
    );
    expect(coursesService.registerLearner.mock.calls[0][1].learner_id).not.toBe(JASMINE_ID);
    expect(res.statusCode).toBe(201);
  });

  it('updateCourseProgress writes under JWT user, not body learner_id', async () => {
    coursesService.updateLessonProgress = jest.fn().mockResolvedValue({ ok: true });
    const req = {
      params: { id: 'course-1' },
      body: { learner_id: JASMINE_ID, lesson_id: 'lesson-1', completed: true },
      user: { directoryUserId: USER_X, role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await updateCourseProgress(req, res, next);

    expect(coursesService.updateLessonProgress).toHaveBeenCalledWith(
      'course-1',
      expect.objectContaining({ learner_id: USER_X, lesson_id: 'lesson-1' })
    );
    expect(res.statusCode).toBe(200);
  });

  it('getEnrollmentStatus returns 403 when query learner_id mismatches JWT', async () => {
    const req = {
      params: { id: 'course-1' },
      query: { learner_id: USER_Y },
      user: { directoryUserId: USER_X, role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getEnrollmentStatus(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('sendAuthIdentityError formats 401/403 responses', () => {
    const res = createMockRes();
    const handled = sendAuthIdentityError(res, {
      status: 403,
      message: 'Forbidden: learner mismatch'
    });
    expect(handled).toBe(true);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });
});

describe('learner isolation HTTP', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK_AUTH = 'false';
    delete process.env.COORDINATOR_URL;
    delete process.env.COORDINATOR_API_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 without JWT on protected learner progress route', async () => {
    const response = await request(app)
      .get(`/api/v1/courses/learners/${USER_X}/progress`)
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });

  it('feedback submit does not require body learner_id with mock auth', async () => {
    enableMockAuthWithoutCoordinator();
    const fakeCourseId = '00000000-0000-0000-0000-000000000099';

    const response = await request(app)
      .post(`/api/v1/courses/${fakeCourseId}/feedback`)
      .send({ rating: 5, comment: 'Great course' });

    expect(response.body.message).not.toBe('learner_id is required');
    expect(response.status).not.toBe(400);
  });

  it('assessment start uses JWT identity without body learner_id', async () => {
    mockCoordinatorUser(USER_X);
    const fakeCourseId = '00000000-0000-0000-0000-000000000099';

    const response = await request(app)
      .post(`/api/v1/courses/${fakeCourseId}/assessment/start`)
      .set('Authorization', 'Bearer user-x-token')
      .send({ learner_id: JASMINE_ID });

    expect(response.status).not.toBe(400);
    expect(response.body.message).not.toContain('X-User-Id');
  });

  it('public routes remain accessible without user JWT', async () => {
    await request(app).get('/health').expect(200);

    const inputResponse = await request(app)
      .post('/api/v1/courses/input')
      .set('X-Service-Name', 'content-studio')
      .send({
        learner_id: 'service-learner',
        learner_name: 'Service User',
        learning_path: [{ topic_name: 'Basics' }]
      });

    expect(inputResponse.status).not.toBe(401);
  });
});
