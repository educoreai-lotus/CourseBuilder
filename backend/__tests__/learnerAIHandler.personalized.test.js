import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import contentStudioGateway from '../services/gateways/contentStudioGateway.js';
import courseRepository from '../repositories/CourseRepository.js';
import topicRepository from '../repositories/TopicRepository.js';
import moduleRepository from '../repositories/ModuleRepository.js';
import lessonRepository from '../repositories/LessonRepository.js';
import { handleLearnerAIIntegration } from '../integration/handlers/learnerAIHandler.js';
import { handleContentStudioIntegration } from '../integration/handlers/contentStudioHandler.js';
import aiStructureGenerator from '../services/AIStructureGenerator.js';

const originals = {
  sendToContentStudio: contentStudioGateway.sendToContentStudio,
  findByCompetencyAndLearner: courseRepository.findByCompetencyAndLearner,
  createCourse: courseRepository.create,
  findById: courseRepository.findById,
  createTopic: topicRepository.create,
  findByCourseId: topicRepository.findByCourseId,
  createModule: moduleRepository.create,
  findByTopicId: moduleRepository.findByTopicId,
  createLesson: lessonRepository.create,
  generateAIStructure: aiStructureGenerator.generateAIStructure
};

function learnerPayload(overrides = {}) {
  return {
    action: 'push_learning_path',
    user_id: 'learner-1',
    user_name: 'Ada',
    competency_target_name: 'React',
    learning_path: {
      path_title: 'React Path',
      total_estimated_duration_hours: 4,
      learning_modules: [
        {
          module_order: 1,
          module_title: 'Module 1',
          steps: [{ title: 'A' }, { title: 'B' }]
        },
        {
          module_order: 2,
          module_title: 'Module 2',
          steps: [{ title: 'C' }, { title: 'D' }]
        }
      ]
    },
    ...overrides
  };
}

function csTopics(names) {
  return {
    course: [
      {
        topics: names.map((topic_name) => ({
          topic_name,
          contents: [{ content_type: 'text', text: topic_name }]
        }))
      }
    ]
  };
}

describe('handleLearnerAIIntegration personalized lesson placement', () => {
  beforeEach(() => {
    courseRepository.findByCompetencyAndLearner = jest.fn().mockResolvedValue(null);
    courseRepository.create = jest.fn().mockResolvedValue({
      id: 'course-1',
      course_name: 'React',
      course_type: 'learner_specific'
    });
    topicRepository.create = jest.fn().mockResolvedValue({
      id: 'topic-1',
      topic_name: 'Topic 1'
    });

    let moduleSeq = 0;
    moduleRepository.create = jest.fn().mockImplementation(async (data) => {
      moduleSeq += 1;
      return {
        id: `module-${moduleSeq}`,
        module_name: data.module_name,
        topic_id: data.topic_id
      };
    });

    lessonRepository.create = jest.fn().mockImplementation(async (data) => ({
      id: `lesson-${data.lesson_name}`,
      ...data
    }));

    aiStructureGenerator.generateAIStructure = jest.fn().mockResolvedValue({
      structure: {
        topics: [{ topic_name: 'Topic 1', topic_description: null, modules: [] }]
      }
    });
  });

  afterEach(() => {
    contentStudioGateway.sendToContentStudio = originals.sendToContentStudio;
    courseRepository.findByCompetencyAndLearner = originals.findByCompetencyAndLearner;
    courseRepository.create = originals.createCourse;
    courseRepository.findById = originals.findById;
    topicRepository.create = originals.createTopic;
    topicRepository.findByCourseId = originals.findByCourseId;
    moduleRepository.create = originals.createModule;
    moduleRepository.findByTopicId = originals.findByTopicId;
    lessonRepository.create = originals.createLesson;
    aiStructureGenerator.generateAIStructure = originals.generateAIStructure;
  });

  it('places A,B under Module 1 and C,D under Module 2', async () => {
    contentStudioGateway.sendToContentStudio = jest.fn().mockResolvedValue(csTopics(['A', 'B', 'C', 'D']));

    const result = await handleLearnerAIIntegration(learnerPayload(), {});

    expect(result).toEqual({});
    expect(lessonRepository.create).toHaveBeenCalledTimes(4);
    expect(lessonRepository.create.mock.calls[0][0]).toMatchObject({
      module_id: 'module-1',
      lesson_name: 'A'
    });
    expect(lessonRepository.create.mock.calls[1][0]).toMatchObject({
      module_id: 'module-1',
      lesson_name: 'B'
    });
    expect(lessonRepository.create.mock.calls[2][0]).toMatchObject({
      module_id: 'module-2',
      lesson_name: 'C'
    });
    expect(lessonRepository.create.mock.calls[3][0]).toMatchObject({
      module_id: 'module-2',
      lesson_name: 'D'
    });
  });

  it('places consecutive slices for step counts 1, 3, 2', async () => {
    contentStudioGateway.sendToContentStudio = jest
      .fn()
      .mockResolvedValue(csTopics(['A', 'B', 'C', 'D', 'E', 'F']));

    await handleLearnerAIIntegration(
      learnerPayload({
        learning_path: {
          path_title: 'Path',
          learning_modules: [
            { module_order: 1, module_title: 'M1', steps: [{ title: 'A' }] },
            {
              module_order: 2,
              module_title: 'M2',
              steps: [{ title: 'B' }, { title: 'C' }, { title: 'D' }]
            },
            { module_order: 3, module_title: 'M3', steps: [{ title: 'E' }, { title: 'F' }] }
          ]
        }
      }),
      {}
    );

    const byModule = lessonRepository.create.mock.calls.map(([lesson]) => [
      lesson.module_id,
      lesson.lesson_name
    ]);
    expect(byModule).toEqual([
      ['module-1', 'A'],
      ['module-2', 'B'],
      ['module-2', 'C'],
      ['module-2', 'D'],
      ['module-3', 'E'],
      ['module-3', 'F']
    ]);
  });

  it('places CS topics using raw learning_modules array order, not module_order sort', async () => {
    contentStudioGateway.sendToContentStudio = jest
      .fn()
      .mockResolvedValue(csTopics(['B1', 'B2', 'A1']));

    await handleLearnerAIIntegration(
      learnerPayload({
        learning_path: {
          path_title: 'Path',
          learning_modules: [
            {
              module_order: 2,
              module_title: 'B',
              steps: [{ title: 'B1' }, { title: 'B2' }]
            },
            {
              module_order: 1,
              module_title: 'A',
              steps: [{ title: 'A1' }]
            }
          ]
        }
      }),
      {}
    );

    const moduleNameById = {};
    moduleRepository.create.mock.calls.forEach(([data], index) => {
      moduleNameById[`module-${index + 1}`] = data.module_name;
    });

    const persisted = lessonRepository.create.mock.calls.map(([lesson]) => [
      moduleNameById[lesson.module_id],
      lesson.lesson_name
    ]);

    expect(persisted).toEqual([
      ['B', 'B1'],
      ['B', 'B2'],
      ['A', 'A1']
    ]);
    expect(moduleRepository.create.mock.calls.map(([data]) => data.module_name)).toEqual([
      'A',
      'B'
    ]);
  });

  it('fails when CS returns 3 topics for 4 steps and does not persist lessons', async () => {
    contentStudioGateway.sendToContentStudio = jest.fn().mockResolvedValue(csTopics(['A', 'B', 'C']));

    await expect(handleLearnerAIIntegration(learnerPayload(), {})).rejects.toThrow(
      /topic count \(3\) does not match expected step count \(4\)/
    );
    expect(lessonRepository.create).not.toHaveBeenCalled();
  });

  it('fails when CS returns course: []', async () => {
    contentStudioGateway.sendToContentStudio = jest.fn().mockResolvedValue({ course: [] });

    await expect(handleLearnerAIIntegration(learnerPayload(), {})).rejects.toThrow(
      /course is missing or empty/
    );
    expect(lessonRepository.create).not.toHaveBeenCalled();
  });

  it('propagates Content Studio throw and does not return {}', async () => {
    contentStudioGateway.sendToContentStudio = jest
      .fn()
      .mockRejectedValue(new Error('COORDINATOR_URL not set'));

    await expect(handleLearnerAIIntegration(learnerPayload(), {})).rejects.toThrow(
      'COORDINATOR_URL not set'
    );
  });

  it('returns {} on successful creation', async () => {
    contentStudioGateway.sendToContentStudio = jest.fn().mockResolvedValue(csTopics(['A', 'B', 'C', 'D']));

    await expect(handleLearnerAIIntegration(learnerPayload(), {})).resolves.toEqual({});
  });
});

describe('trainer/marketplace Content Studio handler is unchanged', () => {
  afterEach(() => {
    courseRepository.findById = originals.findById;
    topicRepository.findByCourseId = originals.findByCourseId;
    moduleRepository.findByTopicId = originals.findByTopicId;
    lessonRepository.create = originals.createLesson;
  });

  it('still persists inbound CS topics onto the first existing module', async () => {
    courseRepository.findById = jest.fn().mockResolvedValue({
      id: 'trainer-course',
      course_name: 'Trainer Course',
      course_type: 'trainer',
      status: 'active'
    });
    topicRepository.findByCourseId = jest.fn().mockResolvedValue([
      { id: 'topic-a', topic_name: 'T1' },
      { id: 'topic-b', topic_name: 'T2' }
    ]);
    moduleRepository.findByTopicId = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 'mod-first', module_name: 'First' },
        { id: 'mod-second', module_name: 'Second' }
      ])
      .mockResolvedValueOnce([]);
    lessonRepository.create = jest.fn().mockImplementation(async (data) => ({
      id: 'l',
      ...data
    }));

    await handleContentStudioIntegration(
      {
        course_id: 'trainer-course',
        trainer_id: '00000000-0000-0000-0000-000000000099',
        topics: [{ topic_name: 'Lesson X' }, { topic_name: 'Lesson Y' }]
      },
      {}
    );

    expect(lessonRepository.create).toHaveBeenCalledTimes(2);
    expect(lessonRepository.create.mock.calls[0][0].module_id).toBe('mod-first');
    expect(lessonRepository.create.mock.calls[1][0].module_id).toBe('mod-first');
  });
});
