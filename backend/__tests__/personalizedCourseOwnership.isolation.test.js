import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import db from '../config/database.js';
import { cache } from '../services/cache.service.js';
import courseRepository from '../repositories/CourseRepository.js';
import topicRepository from '../repositories/TopicRepository.js';
import moduleRepository from '../repositories/ModuleRepository.js';
import lessonRepository from '../repositories/LessonRepository.js';
import registrationRepository from '../repositories/RegistrationRepository.js';
import versionRepository from '../repositories/VersionRepository.js';
import {
  browseCourses,
  getCourseDetails,
  getLessonDetails,
  registerLearner,
  updateLessonProgress,
  getLearnerProgress
} from '../services/courses.service.js';
import {
  browseCourses as browseCoursesController,
  getCourseDetails as getCourseDetailsController,
  getLessonDetails as getLessonDetailsController,
  getLessonExercises as getLessonExercisesController,
  registerForCourse,
  updateCourseProgress,
  getEnrollmentStatus as getEnrollmentStatusController
} from '../controllers/courses.controller.js';
import {
  submitFeedback,
  getAggregatedFeedback,
  getFeedbackAnalytics,
  feedbackController
} from '../controllers/feedback.controller.js';
import { startAssessment } from '../controllers/assessment.controller.js';
import { coursesService } from '../services/courses.service.js';
import { feedbackService } from '../services/feedback.service.js';
import assessmentGateway from '../services/gateways/assessmentGateway.js';

const USER_A = '82434584-f857-4ad2-87f3-83cbf66f1901';
const USER_B = '311b7e68-8150-4f5f-b787-8cecde706a39';
const COURSE_A = '7f8880a1-11e8-4673-b7f9-31a724c03caf';
const LESSON_A = 'lesson-owned-by-a';
const MARKET_ID = 'market-course-1';

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    set() {
      return this;
    }
  };
  return res;
}

function authReq(learnerId, overrides = {}) {
  return {
    params: { id: COURSE_A, ...overrides.params },
    query: overrides.query || {},
    body: overrides.body || {},
    headers: overrides.headers || {},
    user: { role: 'learner', directoryUserId: learnerId, ...overrides.user }
  };
}

describe('personalized course ownership isolation', () => {
  const originals = {
    dbAny: db.any,
    dbOne: db.one,
    dbOneOrNone: db.oneOrNone,
    dbTx: db.tx,
    findById: courseRepository.findById,
    findByCourseId: topicRepository.findByCourseId,
    findLessonById: lessonRepository.findById,
    findModuleById: moduleRepository.findById,
    findTopicById: topicRepository.findById,
    findByLearnerAndCourse: registrationRepository.findByLearnerAndCourse,
    findByLearnerId: registrationRepository.findByLearnerId,
    findLatestVersion: versionRepository.findLatestVersion,
    getCourseDetails: coursesService.getCourseDetails,
    browseCourses: coursesService.browseCourses,
    getLessonDetails: coursesService.getLessonDetails,
    registerLearner: coursesService.registerLearner,
    updateLessonProgress: coursesService.updateLessonProgress,
    submitFeedback: feedbackService.submitFeedback,
    getLearnerFeedback: feedbackService.getLearnerFeedback,
    updateFeedback: feedbackService.updateFeedback,
    deleteFeedback: feedbackService.deleteFeedback,
    sendToAssessment: assessmentGateway.sendToAssessment
  };

  beforeEach(async () => {
    await cache.clear();
    db.any = jest.fn().mockResolvedValue([]);
    db.one = jest.fn().mockResolvedValue({ total: 0 });
    db.tx = originals.dbTx;
    courseRepository.findById = jest.fn().mockResolvedValue(null);
    topicRepository.findByCourseId = jest.fn().mockResolvedValue([]);
    lessonRepository.findById = jest.fn();
    moduleRepository.findById = jest.fn();
    topicRepository.findById = jest.fn();
    registrationRepository.findByLearnerAndCourse = jest.fn();
    registrationRepository.findByLearnerId = jest.fn().mockResolvedValue([]);
    versionRepository.findLatestVersion = jest.fn().mockResolvedValue(null);
    db.oneOrNone = jest.fn().mockResolvedValue(null);
  });

  afterEach(() => {
    db.any = originals.dbAny;
    db.one = originals.dbOne;
    db.oneOrNone = originals.dbOneOrNone;
    db.tx = originals.dbTx;
    courseRepository.findById = originals.findById;
    topicRepository.findByCourseId = originals.findByCourseId;
    lessonRepository.findById = originals.findLessonById;
    moduleRepository.findById = originals.findModuleById;
    topicRepository.findById = originals.findTopicById;
    registrationRepository.findByLearnerAndCourse = originals.findByLearnerAndCourse;
    registrationRepository.findByLearnerId = originals.findByLearnerId;
    versionRepository.findLatestVersion = originals.findLatestVersion;
    coursesService.getCourseDetails = originals.getCourseDetails;
    coursesService.browseCourses = originals.browseCourses;
    coursesService.getLessonDetails = originals.getLessonDetails;
    coursesService.registerLearner = originals.registerLearner;
    coursesService.updateLessonProgress = originals.updateLessonProgress;
    feedbackService.submitFeedback = originals.submitFeedback;
    feedbackService.getLearnerFeedback = originals.getLearnerFeedback;
    feedbackService.updateFeedback = originals.updateFeedback;
    feedbackService.deleteFeedback = originals.deleteFeedback;
    assessmentGateway.sendToAssessment = originals.sendToAssessment;
  });

  function personalizedCourse(ownerId = USER_A) {
    return {
      id: COURSE_A,
      course_name: 'User A Path',
      course_type: 'learner_specific',
      created_by_user_id: ownerId,
      status: 'active',
      learning_path_designation: {},
      studentsIDDictionary: {},
      lesson_completion_dictionary: {}
    };
  }

  function marketplaceCourse() {
    return {
      id: MARKET_ID,
      course_name: 'Marketplace',
      course_type: 'trainer',
      created_by_user_id: 'trainer-1',
      status: 'active',
      learning_path_designation: {}
    };
  }

  describe('LIST browse SQL + cache', () => {
    it('includes ownership predicate and authenticated learner id', async () => {
      await browseCourses({
        page: 1,
        limit: 100,
        role: 'learner',
        learnerId: USER_B
      });

      expect(db.any).toHaveBeenCalled();
      const [sql, params] = db.any.mock.calls[0];
      expect(sql).toContain("c.course_type <> 'learner_specific'");
      expect(sql).toContain('c.created_by_user_id = $');
      expect(params[0]).toBe(USER_B);

      const [countSql, countParams] = db.one.mock.calls[0];
      expect(countSql).toContain("c.course_type <> 'learner_specific'");
      expect(countParams[0]).toBe(USER_B);
    });

    it('browse controller passes JWT directoryUserId, not query learner_id', async () => {
      coursesService.browseCourses = jest.fn().mockResolvedValue({ page: 1, total: 0, courses: [] });
      const req = authReq(USER_A, { query: { limit: 100, learner_id: USER_B, page: 1 } });
      const res = mockRes();
      await browseCoursesController(req, res, jest.fn());

      expect(coursesService.browseCourses).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: USER_A,
          role: 'learner',
          limit: 100
        })
      );
      expect(res.statusCode).toBe(200);
    });

    it('isolates browse cache between User A and User B', async () => {
      db.any.mockResolvedValue([]);
      db.one.mockResolvedValue({ total: 0 });

      await browseCourses({ page: 1, limit: 10, role: 'learner', learnerId: USER_A });
      await browseCourses({ page: 1, limit: 10, role: 'learner', learnerId: USER_B });
      expect(db.any).toHaveBeenCalledTimes(2);

      await browseCourses({ page: 1, limit: 10, role: 'learner', learnerId: USER_A });
      expect(db.any).toHaveBeenCalledTimes(2);
    });
  });

  describe('DETAIL', () => {
    it('User A can load own personalized course; topics are fetched', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      topicRepository.findByCourseId = jest.fn().mockResolvedValue([]);
      registrationRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue(null);
      db.one = jest.fn().mockResolvedValue({ total: 0, active: 0, completed: 0, avg: 0 });
      db.oneOrNone = jest.fn().mockResolvedValue({ avg: 0 });

      const result = await getCourseDetails(COURSE_A, { learnerId: USER_A, role: 'learner' });
      expect(result).not.toBeNull();
      expect(result.id).toBe(COURSE_A);
      expect(topicRepository.findByCourseId).toHaveBeenCalledWith(COURSE_A);
    });

    it('User B gets null (404) for User A personalized course before content load', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      topicRepository.findByCourseId = jest.fn();

      const result = await getCourseDetails(COURSE_A, { learnerId: USER_B, role: 'learner' });
      expect(result).toBeNull();
      expect(topicRepository.findByCourseId).not.toHaveBeenCalled();
    });

    it('marketplace course details unchanged for User B', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(marketplaceCourse());
      topicRepository.findByCourseId = jest.fn().mockResolvedValue([]);
      registrationRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue(null);
      db.one = jest.fn().mockResolvedValue({ total: 0, active: 0, completed: 0, avg: 0 });
      db.oneOrNone = jest.fn().mockResolvedValue({ avg: 0 });

      const result = await getCourseDetails(MARKET_ID, { learnerId: USER_B, role: 'learner' });
      expect(result).not.toBeNull();
      expect(result.id).toBe(MARKET_ID);
    });

    it('detail controller returns 404 when service denies access', async () => {
      coursesService.getCourseDetails = jest.fn().mockResolvedValue(null);
      const req = authReq(USER_B);
      const res = mockRes();
      await getCourseDetailsController(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
    });
  });

  describe('LESSON + EXERCISES', () => {
    beforeEach(() => {
      lessonRepository.findById = jest.fn().mockResolvedValue({
        id: LESSON_A,
        module_id: 'mod-1',
        lesson_name: 'L1',
        lesson_description: '',
        content_type: 'text',
        content_data: [{ secret: true }],
        devlab_exercises: [{ html: '<p>lab</p>' }],
        skills: [],
        trainer_ids: []
      });
      moduleRepository.findById = jest.fn().mockResolvedValue({ id: 'mod-1', topic_id: 'top-1', module_name: 'M' });
      topicRepository.findById = jest.fn().mockResolvedValue({ id: 'top-1', course_id: COURSE_A });
    });

    it('User A can GET own personalized lesson content', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      const lesson = await getLessonDetails(LESSON_A, { learnerId: USER_A });
      expect(lesson).not.toBeNull();
      expect(lesson.content_data).toEqual([{ secret: true }]);
      expect(lesson.devlab_exercises).toHaveLength(1);
    });

    it('User B gets null for that lesson', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      const lesson = await getLessonDetails(LESSON_A, { learnerId: USER_B });
      expect(lesson).toBeNull();
    });

    it('lesson controller uses JWT id and returns 404 for foreign lesson', async () => {
      coursesService.getLessonDetails = jest.fn().mockResolvedValue(null);
      const req = authReq(USER_B, { params: { id: LESSON_A } });
      const res = mockRes();
      await getLessonDetailsController(req, res, jest.fn());
      expect(coursesService.getLessonDetails).toHaveBeenCalledWith(LESSON_A, { learnerId: USER_B });
      expect(res.statusCode).toBe(404);
    });

    it('exercises controller uses same lesson ACL', async () => {
      coursesService.getLessonDetails = jest.fn().mockResolvedValue(null);
      const req = authReq(USER_B, { params: { id: LESSON_A } });
      const res = mockRes();
      await getLessonExercisesController(req, res, jest.fn());
      expect(coursesService.getLessonDetails).toHaveBeenCalledWith(LESSON_A, { learnerId: USER_B });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('ENROLLMENT', () => {
    it('User A may register on own personalized course', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      registrationRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue(null);
      registrationRepository.create = jest.fn().mockResolvedValue({
        id: 'reg-1',
        enrolled_date: new Date()
      });
      courseRepository.update = jest.fn().mockResolvedValue({});

      const result = await registerLearner(COURSE_A, { learner_id: USER_A });
      expect(result.status).toBe('registered');
    });

    it('User B cannot register on User A personalized course', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      registrationRepository.findByLearnerAndCourse = jest.fn();

      await expect(registerLearner(COURSE_A, { learner_id: USER_B })).rejects.toMatchObject({
        status: 404
      });
      expect(registrationRepository.findByLearnerAndCourse).not.toHaveBeenCalled();
    });

    it('marketplace registration still allowed for User B', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(marketplaceCourse());
      registrationRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue(null);
      registrationRepository.create = jest.fn().mockResolvedValue({
        id: 'reg-2',
        enrolled_date: new Date()
      });
      courseRepository.update = jest.fn().mockResolvedValue({});

      const result = await registerLearner(MARKET_ID, { learner_id: USER_B });
      expect(result.status).toBe('registered');
    });
  });

  describe('PROGRESS', () => {
    it('User B cannot mutate progress even with a pre-existing registration', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      registrationRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue({
        id: 'stale-reg',
        status: 'in_progress'
      });
      db.tx = jest.fn(async (fn) => fn({ one: jest.fn() }));

      await expect(
        updateLessonProgress(COURSE_A, {
          learner_id: USER_B,
          lesson_id: LESSON_A,
          completed: true
        })
      ).rejects.toMatchObject({ status: 404 });
      expect(registrationRepository.findByLearnerAndCourse).not.toHaveBeenCalled();
    });

    it('progress controller returns 404 for foreign personalized course', async () => {
      coursesService.updateLessonProgress = jest.fn().mockRejectedValue(
        Object.assign(new Error('Course not found'), { status: 404 })
      );
      const req = authReq(USER_B, { body: { lesson_id: LESSON_A, completed: true } });
      const res = mockRes();
      await updateCourseProgress(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
    });
  });

  describe('FEEDBACK AGGREGATE + ANALYTICS', () => {
    it('User A can GET feedback aggregate for own learner_specific course', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      db.oneOrNone = jest.fn().mockResolvedValue({ average_rating: 0, total_ratings: '0' });
      const req = authReq(USER_A, { params: { courseId: COURSE_A } });
      const res = mockRes();
      await getAggregatedFeedback(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.course_id).toBe(COURSE_A);
      expect(res.body.total_ratings).toBe(0);
      expect(res.body.recent_comments).toEqual([]);
    });

    it('User B gets 404 for User A learner_specific aggregate', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      db.oneOrNone = jest.fn();
      db.any = jest.fn();
      const req = authReq(USER_B, { params: { courseId: COURSE_A } });
      const res = mockRes();
      await getAggregatedFeedback(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
      expect(db.oneOrNone).not.toHaveBeenCalled();
      expect(db.any).not.toHaveBeenCalled();
    });

    it('marketplace feedback aggregate unchanged for User B', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(marketplaceCourse());
      db.oneOrNone = jest.fn().mockResolvedValue({ average_rating: 4.5, total_ratings: '2' });
      db.any = jest.fn().mockResolvedValue([]);
      const req = authReq(USER_B, { params: { courseId: MARKET_ID, id: MARKET_ID } });
      const res = mockRes();
      await getAggregatedFeedback(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.total_ratings).toBe(2);
      expect(res.body.average_rating).toBe(4.5);
    });

    it('User A can GET analytics for own learner_specific course', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      db.oneOrNone = jest.fn().mockResolvedValue({ average_rating: 0, total_feedback: 0 });
      db.any = jest.fn().mockResolvedValue([]);
      const req = authReq(USER_A);
      const res = mockRes();
      await getFeedbackAnalytics(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.course_id).toBe(COURSE_A);
      expect(res.body.total_feedback).toBe(0);
      expect(res.body.rating_trend).toEqual([]);
    });

    it('User B gets 404 for User A learner_specific analytics', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      db.oneOrNone = jest.fn();
      db.any = jest.fn();
      const req = authReq(USER_B);
      const res = mockRes();
      await getFeedbackAnalytics(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
      expect(db.oneOrNone).not.toHaveBeenCalled();
      expect(db.any).not.toHaveBeenCalled();
    });

    it('marketplace analytics unchanged for User B', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(marketplaceCourse());
      db.oneOrNone = jest.fn().mockResolvedValue({ average_rating: 3, total_feedback: 1 });
      db.any = jest.fn().mockResolvedValue([]);
      const req = authReq(USER_B, { params: { id: MARKET_ID } });
      const res = mockRes();
      await getFeedbackAnalytics(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.course_id).toBe(MARKET_ID);
      expect(res.body.total_feedback).toBe(1);
    });
  });

  describe('ENROLLMENT STATUS', () => {
    it('User A can GET enrollment status for own learner_specific course', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      registrationRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue(null);
      const req = authReq(USER_A);
      const res = mockRes();
      await getEnrollmentStatusController(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        enrolled: false,
        progress: 0,
        completedLessons: 0
      });
    });

    it('User B gets 404 for User A learner_specific course', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      registrationRepository.findByLearnerAndCourse = jest.fn();
      const req = authReq(USER_B);
      const res = mockRes();
      await getEnrollmentStatusController(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
      expect(registrationRepository.findByLearnerAndCourse).not.toHaveBeenCalled();
    });

    it('User B still gets 404 even with a historical foreign registration', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      registrationRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue({
        id: 'stale-reg',
        learner_id: USER_B,
        course_id: COURSE_A,
        status: 'in_progress'
      });
      const req = authReq(USER_B);
      const res = mockRes();
      await getEnrollmentStatusController(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
      expect(registrationRepository.findByLearnerAndCourse).not.toHaveBeenCalled();
    });

    it('marketplace enrollment-status unchanged for User B', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(marketplaceCourse());
      registrationRepository.findByLearnerAndCourse = jest.fn().mockResolvedValue(null);
      const req = authReq(USER_B, { params: { id: MARKET_ID } });
      const res = mockRes();
      await getEnrollmentStatusController(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        enrolled: false,
        progress: 0,
        completedLessons: 0
      });
    });
  });

  describe('PROGRESS LIST', () => {
    it('omits foreign personalized courses from the caller progress list', async () => {
      registrationRepository.findByLearnerId = jest.fn().mockResolvedValue([
        { course_id: COURSE_A, status: 'in_progress', enrolled_date: new Date() }
      ]);
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      const result = await getLearnerProgress(USER_B);
      expect(result).toEqual([]);
    });
  });

  describe('FEEDBACK', () => {
    it('submitFeedback service throws 404 for foreign personalized course', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      await expect(
        originals.submitFeedback(COURSE_A, { learner_id: USER_B, rating: 5, comment: 'nope' })
      ).rejects.toMatchObject({ status: 404 });
    });

    it('User B cannot create/update/delete/read feedback on User A personalized course', async () => {
      feedbackService.submitFeedback = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('Course not found'), { status: 404 }));
      feedbackService.updateFeedback = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('Course not found'), { status: 404 }));
      feedbackService.deleteFeedback = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('Course not found'), { status: 404 }));
      feedbackService.getLearnerFeedback = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('Course not found'), { status: 404 }));

      const req = authReq(USER_B, { body: { rating: 5, comment: 'x' } });

      const submitRes = mockRes();
      await submitFeedback(req, submitRes, jest.fn());
      expect(submitRes.statusCode).toBe(404);

      const updateRes = mockRes();
      await feedbackController.updateFeedback(req, updateRes, jest.fn());
      expect(updateRes.statusCode).toBe(404);

      const deleteRes = mockRes();
      await feedbackController.deleteFeedback(req, deleteRes, jest.fn());
      expect(deleteRes.statusCode).toBe(404);

      const getRes = mockRes();
      await feedbackController.getLearnerFeedback(req, getRes, jest.fn());
      expect(getRes.statusCode).toBe(404);
    });
  });

  describe('ASSESSMENT', () => {
    it('User A may start assessment on own personalized course', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      assessmentGateway.sendToAssessment = jest.fn().mockResolvedValue({
        assessment_session_id: 's1',
        expires_in: 900
      });
      const req = authReq(USER_A, { body: { learner_name: 'Ada' } });
      const res = mockRes();
      await startAssessment(req, res, jest.fn());
      expect(assessmentGateway.sendToAssessment).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('User B cannot start assessment on User A personalized course', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(personalizedCourse(USER_A));
      assessmentGateway.sendToAssessment = jest.fn();
      const req = authReq(USER_B, { body: {} });
      const res = mockRes();
      await startAssessment(req, res, jest.fn());
      expect(assessmentGateway.sendToAssessment).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(404);
    });

    it('marketplace assessment start unchanged', async () => {
      courseRepository.findById = jest.fn().mockResolvedValue(marketplaceCourse());
      assessmentGateway.sendToAssessment = jest.fn().mockResolvedValue({
        assessment_session_id: 's2'
      });
      const req = authReq(USER_B, { params: { id: MARKET_ID }, body: {} });
      const res = mockRes();
      await startAssessment(req, res, jest.fn());
      expect(assessmentGateway.sendToAssessment).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });
});
