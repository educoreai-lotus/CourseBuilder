import { jest, describe, it, expect, afterEach, afterAll } from '@jest/globals';
import { startAssessment } from '../controllers/assessment.controller.js';
import assessmentGateway from '../services/gateways/assessmentGateway.js';
import courseRepository from '../repositories/CourseRepository.js';

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
    }
  };
  return res;
}

describe('startAssessment learner data isolation', () => {
  const originalFindById = courseRepository.findById;
  const originalSendToAssessment = assessmentGateway.sendToAssessment;

  afterEach(() => {
    courseRepository.findById = originalFindById;
    assessmentGateway.sendToAssessment = originalSendToAssessment;
  });

  afterAll(() => {
    courseRepository.findById = originalFindById;
    assessmentGateway.sendToAssessment = originalSendToAssessment;
  });

  it('sends authenticated learner id downstream, not body/header id', async () => {
    courseRepository.findById = jest.fn().mockResolvedValue({
      id: COURSE_ID,
      course_name: 'Test Course'
    });
    assessmentGateway.sendToAssessment = jest.fn().mockResolvedValue({
      assessment_session_id: 'session-1',
      expires_in: 900
    });

    const req = {
      params: { id: COURSE_ID },
      body: { learner_id: JASMINE_ID, learner_name: 'Jasmine' },
      headers: { 'x-user-id': JASMINE_ID, 'X-User-Id': JASMINE_ID },
      user: { role: 'learner', directoryUserId: DIRECTORY_USER_ID }
    };
    const res = createMockRes();
    const next = jest.fn();

    await startAssessment(req, res, next);

    expect(assessmentGateway.sendToAssessment).toHaveBeenCalledWith(
      expect.objectContaining({ id: COURSE_ID }),
      DIRECTORY_USER_ID,
      'Jasmine'
    );
    expect(assessmentGateway.sendToAssessment).not.toHaveBeenCalledWith(
      expect.anything(),
      JASMINE_ID,
      expect.anything()
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.assessment_session_id).toBe('session-1');
    expect(next).not.toHaveBeenCalled();
  });
});
