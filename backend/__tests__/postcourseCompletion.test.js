import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import registrationRepository from '../repositories/RegistrationRepository.js';
import courseRepository from '../repositories/CourseRepository.js';
import assessmentRepository from '../repositories/AssessmentRepository.js';
import topicRepository from '../repositories/TopicRepository.js';
import moduleRepository from '../repositories/ModuleRepository.js';
import lessonRepository from '../repositories/LessonRepository.js';
import versionRepository from '../repositories/VersionRepository.js';
import db from '../config/database.js';
import { coursesService } from '../services/courses.service.js';
import assessmentHandler from '../integration/handlers/assessmentHandler.js';
import {
  hasPassedPostcourseAssessment,
  resolveLearnerCourseProgress
} from '../utils/postcourseCompletion.js';

const LEARNER_ID = 'dir-learner-001';
const COURSE_ID = 'course-001';
const REGISTRATION_ID = 'reg-001';

function makeAssessment(overrides = {}) {
  return {
    id: 'assessment-1',
    learner_id: LEARNER_ID,
    course_id: COURSE_ID,
    exam_type: 'postcourse',
    passing_grade: 70,
    final_grade: 85,
    passed: true,
    ...overrides
  };
}

function makeRegistration(overrides = {}) {
  return {
    id: REGISTRATION_ID,
    learner_id: LEARNER_ID,
    course_id: COURSE_ID,
    status: 'in_progress',
    enrolled_date: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides
  };
}

function makeCourse(overrides = {}) {
  return {
    id: COURSE_ID,
    course_name: 'Test Course',
    status: 'active',
    level: 'beginner',
    course_type: 'trainer',
    learning_path_designation: {},
    lesson_completion_dictionary: {},
    studentsIDDictionary: {},
    ...overrides
  };
}

describe('postcourseCompletion helpers', () => {
  it('treats passed postcourse assessment as completion', () => {
    expect(hasPassedPostcourseAssessment(makeAssessment())).toBe(true);
    expect(
      resolveLearnerCourseProgress({
        registrationStatus: 'in_progress',
        assessment: makeAssessment(),
        lessonBasedProgress: 0
      })
    ).toEqual({ progress: 100, status: 'completed' });
  });

  it('does not treat baseline assessment as completion', () => {
    const baseline = makeAssessment({ exam_type: 'baseline', passed: true });
    expect(hasPassedPostcourseAssessment(baseline)).toBe(false);
    expect(
      resolveLearnerCourseProgress({
        registrationStatus: 'in_progress',
        assessment: baseline,
        lessonBasedProgress: 0
      })
    ).toEqual({ progress: 0, status: 'in_progress' });
  });

  it('does not treat failed postcourse assessment as completion', () => {
    const failed = makeAssessment({ passed: false, final_grade: 40 });
    expect(hasPassedPostcourseAssessment(failed)).toBe(false);
    expect(
      resolveLearnerCourseProgress({
        registrationStatus: 'in_progress',
        assessment: failed,
        lessonBasedProgress: 0
      })
    ).toEqual({ progress: 0, status: 'in_progress' });
  });
});

describe('coursesService.getLearnerProgress', () => {
  const originals = {
    findByLearnerId: registrationRepository.findByLearnerId,
    findById: courseRepository.findById,
    findByLearnerAndCourse: assessmentRepository.findByLearnerAndCourse,
    dbOne: db.one,
    dbOneOrNone: db.oneOrNone
  };

  beforeEach(() => {
    registrationRepository.findByLearnerId = jest.fn().mockResolvedValue([makeRegistration()]);
    courseRepository.findById = jest.fn().mockResolvedValue(makeCourse());
    assessmentRepository.findByLearnerAndCourse = jest.fn();
    db.one = jest.fn().mockResolvedValue({ total: 4 });
    db.oneOrNone = jest.fn().mockResolvedValue({ avg: null });
  });

  afterEach(() => {
    Object.assign(registrationRepository, originals);
    Object.assign(courseRepository, { findById: originals.findById });
    Object.assign(assessmentRepository, {
      findByLearnerAndCourse: originals.findByLearnerAndCourse
    });
    db.one = originals.dbOne;
    db.oneOrNone = originals.dbOneOrNone;
  });

  it('returns completed progress when postcourse assessment passed with 0 lesson progress', async () => {
    assessmentRepository.findByLearnerAndCourse = jest
      .fn()
      .mockResolvedValue(makeAssessment());

    const result = await coursesService.getLearnerProgress(LEARNER_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      course_id: COURSE_ID,
      progress: 100,
      status: 'completed'
    });
    expect(assessmentRepository.findByLearnerAndCourse).toHaveBeenCalledWith(
      LEARNER_ID,
      COURSE_ID
    );
  });

  it('does not complete course for passed baseline assessment', async () => {
    assessmentRepository.findByLearnerAndCourse = jest
      .fn()
      .mockResolvedValue(makeAssessment({ exam_type: 'baseline' }));

    const result = await coursesService.getLearnerProgress(LEARNER_ID);

    expect(result[0]).toMatchObject({
      progress: 0,
      status: 'in_progress'
    });
  });

  it('does not complete course for failed postcourse assessment', async () => {
    assessmentRepository.findByLearnerAndCourse = jest
      .fn()
      .mockResolvedValue(makeAssessment({ passed: false }));

    const result = await coursesService.getLearnerProgress(LEARNER_ID);

    expect(result[0]).toMatchObject({
      progress: 0,
      status: 'in_progress'
    });
  });

  it('keeps lesson-based progress when no passed postcourse assessment exists', async () => {
    assessmentRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue(null);
    courseRepository.findById = jest.fn().mockResolvedValue(
      makeCourse({
        lesson_completion_dictionary: {
          'lesson-1': { [LEARNER_ID]: { status: 'completed' } },
          'lesson-2': { [LEARNER_ID]: { status: 'completed' } }
        }
      })
    );

    const result = await coursesService.getLearnerProgress(LEARNER_ID);

    expect(result[0]).toMatchObject({
      progress: 50,
      status: 'in_progress'
    });
  });
});

describe('coursesService.getEnrollmentStatus', () => {
  const originals = {
    findByLearnerAndCourse: registrationRepository.findByLearnerAndCourse,
    findByLearnerAndCourseAssessment: assessmentRepository.findByLearnerAndCourse,
    dbOne: db.one,
    dbOneOrNone: db.oneOrNone
  };

  beforeEach(() => {
    registrationRepository.findByLearnerAndCourse = jest
      .fn()
      .mockResolvedValue(makeRegistration());
    assessmentRepository.findByLearnerAndCourse = jest.fn();
    db.oneOrNone = jest.fn().mockResolvedValue({
      lesson_completion_dictionary: {}
    });
    db.one = jest.fn().mockResolvedValue({ total: 3 });
  });

  afterEach(() => {
    registrationRepository.findByLearnerAndCourse = originals.findByLearnerAndCourse;
    assessmentRepository.findByLearnerAndCourse = originals.findByLearnerAndCourseAssessment;
    db.one = originals.dbOne;
    db.oneOrNone = originals.dbOneOrNone;
  });

  it('returns completed enrollment when postcourse assessment passed', async () => {
    assessmentRepository.findByLearnerAndCourse = jest
      .fn()
      .mockResolvedValue(makeAssessment());

    const result = await coursesService.getEnrollmentStatus(COURSE_ID, LEARNER_ID);

    expect(result).toEqual({
      enrolled: true,
      progress: 100,
      status: 'completed',
      completedLessons: 0
    });
  });
});

describe('coursesService.getCourseById learner overlay', () => {
  const originals = {
    findById: courseRepository.findById,
    findByCourseIdTopics: topicRepository.findByCourseId,
    findByTopicId: moduleRepository.findByTopicId,
    findByModuleId: lessonRepository.findByModuleId,
    findLatestVersion: versionRepository.findLatestVersion,
    findByLearnerAndCourseRegistration: registrationRepository.findByLearnerAndCourse,
    findByLearnerAndCourseAssessment: assessmentRepository.findByLearnerAndCourse,
    dbOne: db.one,
    dbOneOrNone: db.oneOrNone
  };

  const uniqueCourseId = `course-details-${Date.now()}`;

  beforeEach(() => {
    topicRepository.findByCourseId = jest.fn().mockResolvedValue([]);
    moduleRepository.findByTopicId = jest.fn().mockResolvedValue([]);
    lessonRepository.findByModuleId = jest.fn().mockResolvedValue([]);
    versionRepository.findLatestVersion = jest.fn().mockResolvedValue(null);
    courseRepository.findById = jest.fn().mockResolvedValue(
      makeCourse({ id: uniqueCourseId })
    );
    registrationRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue(
      makeRegistration({ course_id: uniqueCourseId })
    );
    assessmentRepository.findByLearnerAndCourse = jest
      .fn()
      .mockResolvedValue(makeAssessment({ course_id: uniqueCourseId }));
    db.one = jest.fn().mockImplementation((query) => {
      if (query.includes('COUNT(*)::int as total') && query.includes('lessons')) {
        return Promise.resolve({ total: 5 });
      }
      if (query.includes('COUNT(*)::int as total') && query.includes('registrations')) {
        return Promise.resolve({ total: 1 });
      }
      if (query.includes('status = $2')) {
        return Promise.resolve({ active: 1, completed: 0 });
      }
      return Promise.resolve({ total: 0, active: 0, completed: 0 });
    });
    db.oneOrNone = jest.fn().mockResolvedValue({ avg: null });
  });

  afterEach(() => {
    courseRepository.findById = originals.findById;
    topicRepository.findByCourseId = originals.findByCourseIdTopics;
    moduleRepository.findByTopicId = originals.findByTopicId;
    lessonRepository.findByModuleId = originals.findByModuleId;
    versionRepository.findLatestVersion = originals.findLatestVersion;
    registrationRepository.findByLearnerAndCourse = originals.findByLearnerAndCourseRegistration;
    assessmentRepository.findByLearnerAndCourse = originals.findByLearnerAndCourseAssessment;
    db.one = originals.dbOne;
    db.oneOrNone = originals.dbOneOrNone;
  });

  it('returns completed learner_progress when postcourse assessment passed', async () => {
    const course = await coursesService.getCourseById(uniqueCourseId, {
      learnerId: LEARNER_ID,
      role: 'learner'
    });

    expect(course.learner_progress).toMatchObject({
      is_enrolled: true,
      progress: 100,
      status: 'completed'
    });
    expect(course.assessment).toMatchObject({
      exam_type: 'postcourse',
      passed: true
    });
  });
});

describe('assessmentHandler.handleAssessmentIntegration exam result persistence', () => {
  const originals = {
    findByLearnerAndCourseAssessment: assessmentRepository.findByLearnerAndCourse,
    createAssessment: assessmentRepository.create,
    findByLearnerAndCourseRegistration: registrationRepository.findByLearnerAndCourse,
    updateRegistration: registrationRepository.update,
    findByIdCourse: courseRepository.findById
  };

  beforeEach(() => {
    assessmentRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue(null);
    assessmentRepository.create = jest.fn().mockImplementation(async (data) => ({
      id: 'assessment-new',
      ...data
    }));
    registrationRepository.findByLearnerAndCourse = jest.fn();
    registrationRepository.update = jest.fn().mockResolvedValue({});
    courseRepository.findById = jest.fn().mockResolvedValue(makeCourse());
  });

  afterEach(() => {
    assessmentRepository.findByLearnerAndCourse = originals.findByLearnerAndCourseAssessment;
    assessmentRepository.create = originals.createAssessment;
    registrationRepository.findByLearnerAndCourse = originals.findByLearnerAndCourseRegistration;
    registrationRepository.update = originals.updateRegistration;
    courseRepository.findById = originals.findByIdCourse;
  });

  const examPayload = {
    user_id: LEARNER_ID,
    course_id: COURSE_ID,
    exam_type: 'postcourse',
    passing_grade: 70,
    final_grade: 88,
    passed: true
  };

  it('marks registration completed when postcourse assessment passed', async () => {
    registrationRepository.findByLearnerAndCourse = jest
      .fn()
      .mockResolvedValue(makeRegistration());

    await assessmentHandler.handleAssessmentIntegration(
      examPayload,
      {},
      'assessment-service'
    );

    expect(registrationRepository.update).toHaveBeenCalledWith(REGISTRATION_ID, {
      status: 'completed',
      completed_date: expect.any(Date)
    });
  });

  it('does not update registration for passed baseline assessment', async () => {
    registrationRepository.findByLearnerAndCourse = jest
      .fn()
      .mockResolvedValue(makeRegistration());

    await assessmentHandler.handleAssessmentIntegration(
      { ...examPayload, exam_type: 'baseline' },
      {},
      'assessment-service'
    );

    expect(registrationRepository.update).not.toHaveBeenCalled();
  });

  it('does not update registration for failed postcourse assessment', async () => {
    registrationRepository.findByLearnerAndCourse = jest
      .fn()
      .mockResolvedValue(makeRegistration());

    await assessmentHandler.handleAssessmentIntegration(
      { ...examPayload, passed: false, final_grade: 50 },
      {},
      'assessment-service'
    );

    expect(registrationRepository.update).not.toHaveBeenCalled();
  });

  it('does not crash when registration is missing', async () => {
    registrationRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue(null);

    await expect(
      assessmentHandler.handleAssessmentIntegration(
        examPayload,
        {},
        'assessment-service'
      )
    ).resolves.toEqual({});

    expect(registrationRepository.update).not.toHaveBeenCalled();
    expect(assessmentRepository.create).toHaveBeenCalled();
  });
});
