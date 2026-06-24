import { jest, describe, it, expect, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import { getLearnerProgress } from '../controllers/courses.controller.js';
import { coursesService } from '../services/courses.service.js';

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

describe('getLearnerProgress', () => {
  const originalGetLearnerProgress = coursesService.getLearnerProgress;

  afterAll(() => {
    coursesService.getLearnerProgress = originalGetLearnerProgress;
  });

  it('uses path learnerId for lookup', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([{ course_id: 'c-1' }]);

    const req = {
      params: { learnerId: JASMINE_ID },
      user: { role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(coursesService.getLearnerProgress).toHaveBeenCalledWith(JASMINE_ID);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ course_id: 'c-1' }]);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when learnerId param is missing', async () => {
    coursesService.getLearnerProgress = jest.fn();

    const req = { params: {}, user: { role: 'learner' } };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Learner ID is required');
    expect(coursesService.getLearnerProgress).not.toHaveBeenCalled();
  });

  it('does not require req.user.directoryUserId', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([]);

    const req = {
      params: { learnerId: JASMINE_ID },
      user: { role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getLearnerProgress(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns empty array when user has no enrollments', async () => {
    coursesService.getLearnerProgress = jest.fn().mockResolvedValue([]);

    const req = { params: { learnerId: JASMINE_ID } };
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
