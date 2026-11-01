import {
  TRAINER_PUBLISH_LESSON_ORDER_KEY,
  validateTrainerPublishLessonOrder,
  applyTrainerPublishLessonOrderToTopicsTree,
  mergeTrainerPublishLessonOrder
} from '../utils/trainerPublishLessonOrder.js';
import { insertTrainerCourseInTransaction } from '../services/trainerPublish/finalizePersist.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const L1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const L2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const L3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('trainerPublishLessonOrder', () => {
  describe('validateTrainerPublishLessonOrder', () => {
    it('accepts exact unique UUID set matching course lessons', () => {
      expect(
        validateTrainerPublishLessonOrder([L1, L2, L3], [L1, L2, L3])
      ).toEqual([L1, L2, L3]);
    });

    it('rejects missing, duplicate, unknown, invalid, non-array, and partial lists', () => {
      expect(validateTrainerPublishLessonOrder(null, [L1])).toBeNull();
      expect(validateTrainerPublishLessonOrder('x', [L1])).toBeNull();
      expect(validateTrainerPublishLessonOrder([L1, L1], [L1, L2])).toBeNull();
      expect(validateTrainerPublishLessonOrder([L1, L2], [L1, L2, L3])).toBeNull();
      expect(validateTrainerPublishLessonOrder([L1, L2, L3], [L1, L2])).toBeNull();
      expect(
        validateTrainerPublishLessonOrder(
          [L1, L2, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'],
          [L1, L2, L3]
        )
      ).toBeNull();
      expect(validateTrainerPublishLessonOrder(['not-a-uuid', L2, L3], [L1, L2, L3])).toBeNull();
    });
  });

  describe('applyTrainerPublishLessonOrderToTopicsTree', () => {
    function treeAlphabetical() {
      // Alphabetical by name: React Level, React Level 1, React Level 3
      return [
        {
          id: 'topic-1',
          modules: [
            {
              id: 'mod-1',
              lessons: [
                { id: L2, lesson_name: 'React Level' },
                { id: L1, lesson_name: 'React Level 1' },
                { id: L3, lesson_name: 'React Level 3' }
              ]
            }
          ]
        }
      ];
    }

    it('restores trainer order React Level 1 → React Level → React Level 3', () => {
      const result = applyTrainerPublishLessonOrderToTopicsTree(treeAlphabetical(), {
        [TRAINER_PUBLISH_LESSON_ORDER_KEY]: [L1, L2, L3]
      });
      expect(result.applied).toBe(true);
      expect(result.topicsData[0].modules[0].lessons.map((l) => l.lesson_name)).toEqual([
        'React Level 1',
        'React Level',
        'React Level 3'
      ]);
    });

    it('preserves hierarchy and per-module order with multiple modules', () => {
      const M1A = '11111111-1111-4111-8111-111111111111';
      const M1B = '22222222-2222-4222-8222-222222222222';
      const M2A = '33333333-3333-4333-8333-333333333333';
      const topics = [
        {
          id: 't1',
          modules: [
            {
              id: 'm1',
              lessons: [
                { id: M1B, lesson_name: 'B' },
                { id: M1A, lesson_name: 'A' }
              ]
            },
            {
              id: 'm2',
              lessons: [{ id: M2A, lesson_name: 'C' }]
            }
          ]
        }
      ];
      // Global trainer order: A, B, C
      const result = applyTrainerPublishLessonOrderToTopicsTree(topics, {
        [TRAINER_PUBLISH_LESSON_ORDER_KEY]: [M1A, M1B, M2A]
      });
      expect(result.applied).toBe(true);
      expect(result.topicsData[0].modules[0].lessons.map((l) => l.id)).toEqual([M1A, M1B]);
      expect(result.topicsData[0].modules[1].lessons.map((l) => l.id)).toEqual([M2A]);
      expect(result.topicsData[0].modules).toHaveLength(2);
    });

    it('keeps alphabetical when metadata missing', () => {
      const original = treeAlphabetical();
      const result = applyTrainerPublishLessonOrderToTopicsTree(original, {});
      expect(result.applied).toBe(false);
      expect(result.topicsData).toBe(original);
    });

    it('fails closed to original tree on malformed metadata', () => {
      const original = treeAlphabetical();
      const cases = [
        { [TRAINER_PUBLISH_LESSON_ORDER_KEY]: [L1] },
        { [TRAINER_PUBLISH_LESSON_ORDER_KEY]: [L1, L1, L3] },
        { [TRAINER_PUBLISH_LESSON_ORDER_KEY]: 'not-array' },
        {
          [TRAINER_PUBLISH_LESSON_ORDER_KEY]: [
            L1,
            L2,
            'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
          ]
        }
      ];
      for (const lpd of cases) {
        const result = applyTrainerPublishLessonOrderToTopicsTree(original, lpd);
        expect(result.applied).toBe(false);
        expect(result.topicsData).toBe(original);
      }
    });
  });

  describe('mergeTrainerPublishLessonOrder', () => {
    it('preserves existing LPD keys', () => {
      const merged = mergeTrainerPublishLessonOrder(
        { scheduled_publish_at: '2030-01-01', personalized: false },
        [L1, L2]
      );
      expect(merged.scheduled_publish_at).toBe('2030-01-01');
      expect(merged.personalized).toBe(false);
      expect(merged[TRAINER_PUBLISH_LESSON_ORDER_KEY]).toEqual([L1, L2]);
    });
  });

  describe('insertTrainerCourseInTransaction order persistence [MOCKED tx]', () => {
    it('saves lesson UUIDs in insertion order via jsonb merge inside tx', async () => {
      const createdLessonIds = [];
      let mergedPatch = null;
      const t = {
        none: async (sql, params) => {
          expect(sql).toMatch(/learning_path_designation/);
          mergedPatch = JSON.parse(params[1]);
        },
        oneOrNone: async () => ({
          ord: createdLessonIds
        })
      };

      const result = await insertTrainerCourseInTransaction({
        t,
        courseId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        createdByUserId: '11111111-1111-4111-8111-111111111111',
        normalized: {
          course_name: 'React Course',
          course_description: null,
          lessons: [
            { lesson_name: 'React Level 1', skills: [], trainer_ids: [], content_data: [], devlab_exercises: [], format_order: [] },
            { lesson_name: 'React Level', skills: [], trainer_ids: [], content_data: [], devlab_exercises: [], format_order: [] },
            { lesson_name: 'React Level 3', skills: [], trainer_ids: [], content_data: [], devlab_exercises: [], format_order: [] }
          ]
        },
        repos: {
          courseRepository: {
            create: async () => ({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' })
          },
          topicRepository: {
            create: async () => ({ id: 'topic-1' })
          },
          moduleRepository: {
            create: async () => ({ id: 'module-1' })
          },
          lessonRepository: {
            create: async (data) => {
              const id = `00000000-0000-4000-8000-00000000000${createdLessonIds.length}`;
              createdLessonIds.push(id);
              return { id, lesson_name: data.lesson_name };
            }
          }
        }
      });

      expect(result.lessons_created).toBe(3);
      expect(result.trainer_publish_lesson_order).toEqual(createdLessonIds);
      expect(mergedPatch[TRAINER_PUBLISH_LESSON_ORDER_KEY]).toEqual(createdLessonIds);
      expect(createdLessonIds).toHaveLength(3);
    });

    it('rolls back conceptually when metadata verify fails (throws before return)', async () => {
      await expect(
        insertTrainerCourseInTransaction({
          t: {
            none: async () => {},
            oneOrNone: async () => ({ ord: null })
          },
          courseId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          createdByUserId: '11111111-1111-4111-8111-111111111111',
          normalized: {
            course_name: 'C',
            lessons: [
              {
                lesson_name: 'A',
                skills: [],
                trainer_ids: [],
                content_data: [],
                devlab_exercises: [],
                format_order: []
              }
            ]
          },
          repos: {
            courseRepository: { create: async () => ({ id: 'c' }) },
            topicRepository: { create: async () => ({ id: 't' }) },
            moduleRepository: { create: async () => ({ id: 'm' }) },
            lessonRepository: {
              create: async () => ({ id: L1 })
            }
          }
        })
      ).rejects.toMatchObject({ status: 500 });
    });
  });

  it('does not change LessonRepository ORDER BY lesson_name', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const src = fs.readFileSync(
      path.join(__dirname, '../repositories/LessonRepository.js'),
      'utf8'
    );
    expect(src).toContain(
      'SELECT * FROM lessons WHERE module_id = $1 ORDER BY lesson_name'
    );
  });

  it('schedulePublishing still spreads existing LPD (preserves unknown keys)', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const src = fs.readFileSync(
      path.join(__dirname, '../services/courses.service.js'),
      'utf8'
    );
    expect(src).toContain('...(course.learning_path_designation || {})');
    expect(src).toContain('applyTrainerPublishLessonOrderToTopicsTree');
    // Course Details must not introduce a SQL sort override of its own
    expect(src).not.toMatch(/findByModuleId[\s\S]{0,200}ORDER BY/);
  });
});
