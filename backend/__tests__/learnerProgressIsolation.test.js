import { jest, describe, it, expect, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import { getLearnerProgress } from '../controllers/courses.controller.js';
import { coursesService } from '../services/courses.service.js';

const JASMINE_ID = '50a630f4-826e-45aa-8f70-653e5e592fc3';
const DIRECTORY_USER_ID = 'real-directory-user-id';

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

describe('getLearnerProgress', () => {
  const originalGetLearnerProgress = coursesService.getLearnerProgress;

  afterAll(() => {
    coursesService.getLearnerProgress = originalGetLearnerProgress;
  });

  it('uses req.user.directoryUserId for service lookup, not req.params.learnerId', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([{ course_id: 'c-1' }]);

    const req = {
      params: { learnerId: JASMINE_ID },
      user: { role: 'learner', directoryUserId: DIRECTORY_USER_ID }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(coursesService.getLearnerProgress).toHaveBeenCalledWith(DIRECTORY_USER_ID);
    expect(coursesService.getLearnerProgress).not.toHaveBeenCalledWith(JASMINE_ID);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ course_id: 'c-1' }]);
    expect(next).not.toHaveBeenCalled();
  });

  it('ignores mismatched path learnerId and still uses authenticated directory user id', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([]);

    const req = {
      params: { learnerId: JASMINE_ID },
      user: { role: 'learner', directoryUserId: DIRECTORY_USER_ID }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(coursesService.getLearnerProgress).toHaveBeenCalledWith(DIRECTORY_USER_ID);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 200 with empty array when user has no enrollments', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([]);

    const req = {
      params: { learnerId: JASMINE_ID },
      user: { directoryUserId: DIRECTORY_USER_ID }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user.directoryUserId is missing', async () => {
    coursesService.getLearnerProgress = jest.fn();

    const req = {
      params: { learnerId: JASMINE_ID },
      user: { role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(coursesService.getLearnerProgress).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'unauthorized',
      message: 'Authenticated learner identity is missing'
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('public routes unchanged', () => {
  it('GET /health remains public without Bearer token', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('healthy');
  });
});

describe('getLearnerProgress route', () => {
  it('remains registered at GET /api/v1/courses/learners/:learnerId/progress', async () => {
    const response = await request(app)
      .get(`/api/v1/courses/learners/${JASMINE_ID}/progress`)
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });
});
