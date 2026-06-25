import { jest, describe, it, expect, afterEach, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import {
  getEnrollmentStatus,
  getCourseDetails,
  registerForCourse,
  cancelEnrollment,
  updateCourseProgress
} from '../controllers/courses.controller.js';
import { submitFeedback, feedbackController } from '../controllers/feedback.controller.js';
import { coursesService } from '../services/courses.service.js';
import { feedbackService } from '../services/feedback.service.js';

const JASMINE_ID = '50a630f4-826e-45aa-8f70-653e5e592fc3';
const DIRECTORY_USER_ID = 'real-directory-user-id';
const COURSE_ID = 'course-uuid-1';

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

function authReq(overrides = {}) {
  return {
    params: { id: COURSE_ID, ...overrides.params },
    query: overrides.query || {},
    body: overrides.body || {},
    headers: overrides.headers || {},
    user: { role: 'learner', directoryUserId: DIRECTORY_USER_ID, ...overrides.user }
  };
}

describe('courses learner data isolation', () => {
  const originals = {
    getEnrollmentStatus: coursesService.getEnrollmentStatus,
    getCourseDetails: coursesService.getCourseDetails,
    registerLearner: coursesService.registerLearner,
    cancelEnrollment: coursesService.cancelEnrollment,
    updateLessonProgress: coursesService.updateLessonProgress
  };

  afterEach(() => {
    Object.assign(coursesService, originals);
  });

  afterAll(() => {
    Object.assign(coursesService, originals);
  });

  it('getEnrollmentStatus uses req.user.directoryUserId, not req.query.learner_id', async () => {
    coursesService.getEnrollmentStatus = jest.fn().mockResolvedValue({
      enrolled: true,
      progress: 50,
      completedLessons: 2
    });

    const req = authReq({ query: { learner_id: JASMINE_ID } });
    const res = createMockRes();
    const next = jest.fn();

    await getEnrollmentStatus(req, res, next);

    expect(coursesService.getEnrollmentStatus).toHaveBeenCalledWith(COURSE_ID, DIRECTORY_USER_ID);
    expect(coursesService.getEnrollmentStatus).not.toHaveBeenCalledWith(COURSE_ID, JASMINE_ID);
    expect(res.statusCode).toBe(200);
    expect(res.body.enrolled).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it('getEnrollmentStatus returns not-enrolled shape when service reports no registration', async () => {
    coursesService.getEnrollmentStatus = jest.fn().mockResolvedValue({
      enrolled: false,
      progress: 0,
      completedLessons: 0
    });

    const req = authReq();
    const res = createMockRes();
    const next = jest.fn();

    await getEnrollmentStatus(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      enrolled: false,
      progress: 0,
      completedLessons: 0
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('getCourseDetails learner overlay uses authenticated id, not query id', async () => {
    coursesService.getCourseDetails = jest.fn().mockResolvedValue({ id: COURSE_ID, title: 'Test' });

    const req = authReq({ query: { learner_id: JASMINE_ID } });
    const res = createMockRes();
    const next = jest.fn();

    await getCourseDetails(req, res, next);

    expect(coursesService.getCourseDetails).toHaveBeenCalledWith(COURSE_ID, {
      learnerId: DIRECTORY_USER_ID,
      role: 'learner'
    });
    expect(res.statusCode).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('registerForCourse uses authenticated id, not body learner_id', async () => {
    coursesService.registerLearner = jest.fn().mockResolvedValue({ success: true });

    const req = authReq({
      body: { learner_id: JASMINE_ID, learner_name: 'Other User' }
    });
    const res = createMockRes();
    const next = jest.fn();

    await registerForCourse(req, res, next);

    expect(coursesService.registerLearner).toHaveBeenCalledWith(COURSE_ID, {
      learner_id: DIRECTORY_USER_ID,
      learner_name: 'Other User',
      learner_company: undefined,
      company_id: undefined
    });
    expect(res.statusCode).toBe(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('cancelEnrollment uses authenticated id, not body learner_id', async () => {
    coursesService.cancelEnrollment = jest.fn().mockResolvedValue({ cancelled: true });

    const req = authReq({ body: { learner_id: JASMINE_ID } });
    const res = createMockRes();
    const next = jest.fn();

    await cancelEnrollment(req, res, next);

    expect(coursesService.cancelEnrollment).toHaveBeenCalledWith(COURSE_ID, {
      learner_id: DIRECTORY_USER_ID
    });
    expect(res.statusCode).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('updateCourseProgress uses authenticated id, not body learner_id', async () => {
    coursesService.updateLessonProgress = jest.fn().mockResolvedValue({ progress: 75 });

    const req = authReq({
      body: { learner_id: JASMINE_ID, lesson_id: 'lesson-1', completed: true }
    });
    const res = createMockRes();
    const next = jest.fn();

    await updateCourseProgress(req, res, next);

    expect(coursesService.updateLessonProgress).toHaveBeenCalledWith(COURSE_ID, {
      learner_id: DIRECTORY_USER_ID,
      lesson_id: 'lesson-1',
      completed: true
    });
    expect(res.statusCode).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when directoryUserId is missing on learner endpoints', async () => {
    coursesService.getEnrollmentStatus = jest.fn();

    const req = {
      params: { id: COURSE_ID },
      query: { learner_id: JASMINE_ID },
      user: { role: 'learner' }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getEnrollmentStatus(req, res, next);

    expect(coursesService.getEnrollmentStatus).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authenticated learner identity is missing');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('feedback learner data isolation', () => {
  const originals = {
    submitFeedback: feedbackService.submitFeedback,
    getLearnerFeedback: feedbackService.getLearnerFeedback,
    updateFeedback: feedbackService.updateFeedback,
    deleteFeedback: feedbackService.deleteFeedback
  };

  afterEach(() => {
    Object.assign(feedbackService, originals);
  });

  afterAll(() => {
    Object.assign(feedbackService, originals);
  });

  it('submitFeedback uses authenticated id, not body/query/header id', async () => {
    feedbackService.submitFeedback = jest.fn().mockResolvedValue({ id: 'fb-1' });

    const req = authReq({
      body: { learner_id: JASMINE_ID, rating: 4, comment: 'Good' },
      query: { learner_id: JASMINE_ID },
      headers: { 'x-user-id': JASMINE_ID }
    });
    const res = createMockRes();
    const next = jest.fn();

    await submitFeedback(req, res, next);

    expect(feedbackService.submitFeedback).toHaveBeenCalledWith(COURSE_ID, {
      learner_id: DIRECTORY_USER_ID,
      rating: 4,
      tags: [],
      comment: 'Good'
    });
    expect(res.statusCode).toBe(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('getLearnerFeedback uses authenticated id', async () => {
    feedbackService.getLearnerFeedback = jest.fn().mockResolvedValue({ rating: 5 });

    const req = authReq({
      query: { learner_id: JASMINE_ID },
      headers: { 'x-user-id': JASMINE_ID }
    });
    const res = createMockRes();
    const next = jest.fn();

    await feedbackController.getLearnerFeedback(req, res, next);

    expect(feedbackService.getLearnerFeedback).toHaveBeenCalledWith(COURSE_ID, DIRECTORY_USER_ID);
    expect(res.statusCode).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('updateFeedback uses authenticated id', async () => {
    feedbackService.updateFeedback = jest.fn().mockResolvedValue({ rating: 3 });

    const req = authReq({
      body: { learner_id: JASMINE_ID, rating: 3 },
      headers: { 'x-user-id': JASMINE_ID }
    });
    const res = createMockRes();
    const next = jest.fn();

    await feedbackController.updateFeedback(req, res, next);

    expect(feedbackService.updateFeedback).toHaveBeenCalledWith(
      COURSE_ID,
      DIRECTORY_USER_ID,
      { rating: 3, tags: undefined, comment: undefined }
    );
    expect(res.statusCode).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('deleteFeedback uses authenticated id', async () => {
    feedbackService.deleteFeedback = jest.fn().mockResolvedValue(undefined);

    const req = authReq({
      body: { learner_id: JASMINE_ID },
      headers: { 'x-user-id': JASMINE_ID }
    });
    const res = createMockRes();
    const next = jest.fn();

    await feedbackController.deleteFeedback(req, res, next);

    expect(feedbackService.deleteFeedback).toHaveBeenCalledWith(COURSE_ID, DIRECTORY_USER_ID);
    expect(res.statusCode).toBe(204);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('regression: auth and public routes', () => {
  it('protected course routes still require auth without Bearer token', async () => {
    const enrollment = await request(app)
      .get(`/api/v1/courses/${COURSE_ID}/enrollment-status`)
      .expect(401);
    expect(enrollment.body.error).toBe('unauthorized');

    const register = await request(app)
      .post(`/api/v1/courses/${COURSE_ID}/register`)
      .send({ learner_id: JASMINE_ID })
      .expect(401);
    expect(register.body.error).toBe('unauthorized');
  });

  it('GET /health remains public', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('healthy');
  });
});
