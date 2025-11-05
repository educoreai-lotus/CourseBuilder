import request from 'supertest';
import app from '../server.js';
import db, { pgp } from '../config/database.js';

const samplePayload = {
  learner_id: 'learner-xyz',
  learner_name: 'Jane Doe',
  learner_company: 'Acme Inc',
  learning_path: [
    { topic_name: 'Introduction to AI', topic_language: 'English', topic_description: 'Basics' },
    { topic_name: 'Machine Learning' }
  ],
  skills: ['AI','Python'],
  level: 'beginner',
  duration: 120,
  metadata: { category: 'AI' }
};

describe('InputService + CourseStructureService Integration', () => {
  let createdCourseId;

  afterAll(async () => {
    if (createdCourseId) {
      await db.none('DELETE FROM lessons WHERE topic_id IN (SELECT topic_id FROM topics t JOIN modules m ON t.module_id = m.module_id WHERE m.course_id = $1)', [createdCourseId]);
      await db.none('DELETE FROM topics WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = $1)', [createdCourseId]);
      await db.none('DELETE FROM modules WHERE course_id = $1', [createdCourseId]);
      await db.none('DELETE FROM versions WHERE course_id = $1', [createdCourseId]);
      await db.none('DELETE FROM courses WHERE course_id = $1', [createdCourseId]);
    }
    await pgp.end();
  });

  it('should validate payload and create a course with structure', async () => {
    const res = await request(app)
      .post('/api/v1/courses/input')
      .send(samplePayload)
      .expect(201);

    expect(res.body.status).toBe('accepted');
    expect(res.body.course_id).toBeDefined();
    expect(res.body.structure).toBeDefined();
    expect(res.body.structure.modules).toBe(2);
    expect(res.body.structure.topics).toBe(2);
    expect(res.body.structure.lessons).toBeGreaterThan(0);

    createdCourseId = res.body.course_id;

    // Verify persisted
    const course = await db.one('SELECT * FROM courses WHERE course_id = $1', [createdCourseId]);
    expect(course.status).toBe('draft');

    const moduleCount = await db.one('SELECT COUNT(*) FROM modules WHERE course_id = $1', [createdCourseId]);
    expect(parseInt(moduleCount.count)).toBe(2);

    const topicCount = await db.one('SELECT COUNT(*) FROM topics t JOIN modules m ON t.module_id = m.module_id WHERE m.course_id = $1', [createdCourseId]);
    expect(parseInt(topicCount.count)).toBe(2);

    const lessonCount = await db.one('SELECT COUNT(*) FROM lessons l JOIN topics t ON l.topic_id = t.topic_id JOIN modules m ON t.module_id = m.module_id WHERE m.course_id = $1', [createdCourseId]);
    expect(parseInt(lessonCount.count)).toBeGreaterThan(0);
  });

  it('should reject invalid payloads', async () => {
    const invalid = { ...samplePayload, learning_path: [] };
    const res = await request(app)
      .post('/api/v1/courses/input')
      .send(invalid)
      .expect(400);

    expect(res.body).toHaveProperty('message');
    expect(res.body.message.toLowerCase()).toContain('invalid');
  });

  it('should normalize minimal DTO fields', async () => {
    const res = await request(app)
      .post('/api/v1/courses/input')
      .send({
        learning_path: [{ topic_name: 'Data Science' }],
        skills: ['Data']
      })
      .expect(201);

    expect(res.body.course_id).toBeDefined();
  });
});


