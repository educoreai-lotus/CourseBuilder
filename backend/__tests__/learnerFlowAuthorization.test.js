import { jest, describe, it, expect } from '@jest/globals';
import { authorizeRoles } from '../middleware/auth.middleware.js';
import {
  registerForCourse,
  cancelEnrollment,
  updateCourseProgress
} from '../controllers/courses.controller.js';
import { feedbackController } from '../controllers/feedback.controller.js';
import { startAssessment } from '../controllers/assessment.controller.js';
import { coursesService } from '../services/courses.service.js';
import { feedbackService } from '../services/feedback.service.js';
import assessmentGateway from '../services/gateways/assessmentGateway.js';
import courseRepository from '../repositories/CourseRepository.js';

const DIRECTORY_USER_ID = 'trainer-directory-user-id';
const JASMINE_ID = '50a630f4-826e-45aa-8f70-653e5e592fc3';
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

function trainerReq(overrides = {}) {
  return {
    method: overrides.method || 'POST',
    path: overrides.path || `/api/v1/courses/${COURSE_ID}/register`,
    params: { id: COURSE_ID, ...overrides.params },
    query: overrides.query || {},
    body: overrides.body || {},
    headers: overrides.headers || {},
    user: {
      role: 'trainer',
      directoryUserId: DIRECTORY_USER_ID,
      isTrainer: true,
      ...overrides.user
    }
  };
}

describe('authorizeRoles learner-flow compatibility', () => {
  it('allows req.user.role trainer on learner-only guarded routes', () => {
    const roles = ['learner', 'trainer', 'admin'];
    const next = jest.fn();
    const res = createMockRes();

    for (const routeRole of roles) {
      const req = trainerReq({ user: { role: routeRole, directoryUserId: DIRECTORY_USER_ID } });
      authorizeRoles('learner', 'trainer', 'admin')(req, res, next);
      expect(next).toHaveBeenCalled();
      next.mockClear();
    }
  });

  it('blocks unauthenticated learner-flow routes without user role', () => {
    const req = { method: 'POST', path: '/api/v1/courses/x/register', user: undefined };
    const res = createMockRes();
    const next = jest.fn();

    authorizeRoles('learner', 'trainer', 'admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});

describe('trainer JWT users on learner controllers', () => {
  it('registerForCourse uses directoryUserId, not body learner_id', async () => {
    coursesService.registerLearner = jest.fn().mockResolvedValue({ success: true });

    const req = trainerReq({
      body: { learner_id: JASMINE_ID, learner_name: 'Other' }
    });
    const res = createMockRes();
    const next = jest.fn();

    await registerForCourse(req, res, next);

    expect(coursesService.registerLearner).toHaveBeenCalledWith(COURSE_ID, {
      learner_id: DIRECTORY_USER_ID,
      learner_name: 'Other',
      learner_company: undefined,
      company_id: undefined
    });
    expect(res.statusCode).toBe(201);
  });

  it('updateCourseProgress uses directoryUserId for trainer users', async () => {
    coursesService.updateLessonProgress = jest.fn().mockResolvedValue({ progress: 50 });

    const req = trainerReq({
      method: 'PATCH',
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
  });

  it('cancelEnrollment uses directoryUserId for trainer users', async () => {
    coursesService.cancelEnrollment = jest.fn().mockResolvedValue({ cancelled: true });

    const req = trainerReq({
      method: 'DELETE',
      body: { learner_id: JASMINE_ID }
    });
    const res = createMockRes();
    const next = jest.fn();

    await cancelEnrollment(req, res, next);

    expect(coursesService.cancelEnrollment).toHaveBeenCalledWith(COURSE_ID, {
      learner_id: DIRECTORY_USER_ID
    });
  });

  it('getLearnerFeedback uses directoryUserId for trainer users', async () => {
    feedbackService.getLearnerFeedback = jest.fn().mockResolvedValue({ rating: 4 });

    const req = trainerReq({
      method: 'GET',
      query: { learner_id: JASMINE_ID },
      headers: { 'x-user-id': JASMINE_ID }
    });
    const res = createMockRes();
    const next = jest.fn();

    await feedbackController.getLearnerFeedback(req, res, next);

    expect(feedbackService.getLearnerFeedback).toHaveBeenCalledWith(COURSE_ID, DIRECTORY_USER_ID);
  });

  it('startAssessment passes directoryUserId downstream for trainer users', async () => {
    const originalFindById = courseRepository.findById;
    const originalSend = assessmentGateway.sendToAssessment;

    courseRepository.findById = jest.fn().mockResolvedValue({ id: COURSE_ID, course_name: 'Course' });
    assessmentGateway.sendToAssessment = jest.fn().mockResolvedValue({
      assessment_session_id: 'session-1'
    });

    const req = trainerReq({
      method: 'POST',
      path: `/api/v1/courses/${COURSE_ID}/assessment/start`,
      body: { learner_id: JASMINE_ID },
      headers: { 'x-user-id': JASMINE_ID }
    });
    const res = createMockRes();
    const next = jest.fn();

    await startAssessment(req, res, next);

    expect(assessmentGateway.sendToAssessment).toHaveBeenCalledWith(
      expect.objectContaining({ id: COURSE_ID }),
      DIRECTORY_USER_ID,
      'Learner'
    );

    courseRepository.findById = originalFindById;
    assessmentGateway.sendToAssessment = originalSend;
  });
});

describe('trainer CRUD routes remain trainer/admin guarded', () => {
  it('still blocks learner role from trainer publish route guard', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/courses/x/publish',
      user: { role: 'learner', directoryUserId: DIRECTORY_USER_ID }
    };
    const res = createMockRes();
    const next = jest.fn();

    authorizeRoles('trainer', 'admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});
