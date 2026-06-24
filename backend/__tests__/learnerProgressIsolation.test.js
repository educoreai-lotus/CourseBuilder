import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import { getAuthenticatedLearnerId } from '../utils/authHelpers.js';
import { getLearnerProgress } from '../controllers/courses.controller.js';
import { coursesService } from '../services/courses.service.js';

const USER_X = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_Y = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const JASMINE_ID = '50a630f4-826e-45aa-8f70-653e5e592fc3';

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
    }
  };
  return res;
}

describe('getAuthenticatedLearnerId', () => {
  it('returns directoryUserId from req.user', () => {
    expect(getAuthenticatedLearnerId({ user: { directoryUserId: USER_X } })).toBe(USER_X);
  });

  it('throws 401 when directoryUserId is missing', () => {
    try {
      getAuthenticatedLearnerId({ user: {} });
      throw new Error('expected throw');
    } catch (error) {
      expect(error.status).toBe(401);
    }
  });
});

describe('getLearnerProgress (Phase 2A-safe compatibility)', () => {
  const originalGetLearnerProgress = coursesService.getLearnerProgress;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    warnSpy.mockClear();
  });

  afterAll(() => {
    coursesService.getLearnerProgress = originalGetLearnerProgress;
    warnSpy.mockRestore();
  });

  it('User X with Jasmine path queries User X data only', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([{ course_id: 'c-x' }]);

    const req = {
      params: { learnerId: JASMINE_ID },
      user: { directoryUserId: USER_X, role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(coursesService.getLearnerProgress).toHaveBeenCalledWith(USER_X);
    expect(coursesService.getLearnerProgress).not.toHaveBeenCalledWith(JASMINE_ID);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ course_id: 'c-x' }]);
    expect(warnSpy).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('User Y with Jasmine path queries User Y data only', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([{ course_id: 'c-y' }]);

    const req = {
      params: { learnerId: JASMINE_ID },
      user: { directoryUserId: USER_Y, role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(coursesService.getLearnerProgress).toHaveBeenCalledWith(USER_Y);
    expect(res.body).toEqual([{ course_id: 'c-y' }]);
    expect(res.statusCode).toBe(200);
  });

  it('User X with User Y in path still returns User X data, not User Y', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([]);

    const req = {
      params: { learnerId: USER_Y },
      user: { directoryUserId: USER_X, role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(coursesService.getLearnerProgress).toHaveBeenCalledWith(USER_X);
    expect(coursesService.getLearnerProgress).not.toHaveBeenCalledWith(USER_Y);
    expect(res.statusCode).toBe(200);
    expect(res.statusCode).not.toBe(403);
  });

  it('returns 401 when authenticated learner identity is missing', async () => {
    coursesService.getLearnerProgress = jest.fn();

    const req = {
      params: { learnerId: JASMINE_ID },
      user: { role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('unauthorized');
    expect(coursesService.getLearnerProgress).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns empty array when user has no enrollments', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([]);

    const req = {
      params: { learnerId: JASMINE_ID },
      user: { directoryUserId: USER_X, role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('public routes unchanged', () => {
  it('GET /health remains public without Bearer token', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('healthy');
  });
});

describe('GET /learners/:learnerId/progress HTTP auth', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK_AUTH = 'false';
    delete process.env.COORDINATOR_URL;
    delete process.env.COORDINATOR_API_URL;
  });

  it('returns 401 without JWT', async () => {
    const response = await request(app)
      .get(`/api/v1/courses/learners/${JASMINE_ID}/progress`)
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });
});
