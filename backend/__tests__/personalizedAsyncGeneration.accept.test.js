/**
 * Personalized async generation — legacy flag-OFF regression + async accept path.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import contentStudioGateway from '../services/gateways/contentStudioGateway.js';
import courseRepository from '../repositories/CourseRepository.js';
import topicRepository from '../repositories/TopicRepository.js';
import moduleRepository from '../repositories/ModuleRepository.js';
import lessonRepository from '../repositories/LessonRepository.js';
import personalizedGenerationJobRepository from '../repositories/PersonalizedGenerationJobRepository.js';
import aiStructureGenerator from '../services/AIStructureGenerator.js';
import { handleLearnerAIIntegration } from '../integration/handlers/learnerAIHandler.js';
import { isPersonalizedAsyncGenerationEnabled } from '../utils/personalizedAsyncGeneration.js';

const originals = {
  sendToContentStudio: contentStudioGateway.sendToContentStudio,
  findByCompetencyAndLearner: courseRepository.findByCompetencyAndLearner,
  createCourse: courseRepository.create,
  createTopic: topicRepository.create,
  createModule: moduleRepository.create,
  createLesson: lessonRepository.create,
  generateAIStructure: aiStructureGenerator.generateAIStructure,
  createOrGetActiveJob: personalizedGenerationJobRepository.createOrGetActiveJob,
  flagEnv: process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED
};

function learnerPayload(overrides = {}) {
  return {
    action: 'push_learning_path',
    user_id: 'learner-1',
    user_name: 'Ada',
    competency_target_name: 'React',
    company_id: 'co-1',
    company_name: 'Acme',
    skills_raw_data: ['hooks'],
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

function stubSyncRepos() {
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
  contentStudioGateway.sendToContentStudio = jest
    .fn()
    .mockResolvedValue(csTopics(['A', 'B', 'C', 'D']));
}

describe('personalized async feature flag — legacy regression', () => {
  beforeEach(() => {
    delete process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED;
    stubSyncRepos();
  });

  afterEach(() => {
    contentStudioGateway.sendToContentStudio = originals.sendToContentStudio;
    courseRepository.findByCompetencyAndLearner = originals.findByCompetencyAndLearner;
    courseRepository.create = originals.createCourse;
    topicRepository.create = originals.createTopic;
    moduleRepository.create = originals.createModule;
    lessonRepository.create = originals.createLesson;
    aiStructureGenerator.generateAIStructure = originals.generateAIStructure;
    personalizedGenerationJobRepository.createOrGetActiveJob =
      originals.createOrGetActiveJob;
    if (originals.flagEnv === undefined) {
      delete process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED;
    } else {
      process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED = originals.flagEnv;
    }
  });

  it('flag unset → isPersonalizedAsyncGenerationEnabled is false', () => {
    delete process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED;
    expect(isPersonalizedAsyncGenerationEnabled()).toBe(false);
  });

  it('flag false → isPersonalizedAsyncGenerationEnabled is false', () => {
    process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED = 'false';
    expect(isPersonalizedAsyncGenerationEnabled()).toBe(false);
  });

  it('flag unset → synchronous path calls Content Studio and returns {}', async () => {
    delete process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED;
    personalizedGenerationJobRepository.createOrGetActiveJob = jest.fn();

    const result = await handleLearnerAIIntegration(learnerPayload(), {});

    expect(result).toEqual({});
    expect(contentStudioGateway.sendToContentStudio).toHaveBeenCalledTimes(1);
    expect(aiStructureGenerator.generateAIStructure).toHaveBeenCalled();
    expect(courseRepository.create).toHaveBeenCalled();
    expect(lessonRepository.create).toHaveBeenCalled();
    expect(
      personalizedGenerationJobRepository.createOrGetActiveJob
    ).not.toHaveBeenCalled();
  });

  it('flag false → same synchronous behavior', async () => {
    process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED = 'false';
    personalizedGenerationJobRepository.createOrGetActiveJob = jest.fn();

    const result = await handleLearnerAIIntegration(learnerPayload(), {});

    expect(result).toEqual({});
    expect(contentStudioGateway.sendToContentStudio).toHaveBeenCalledTimes(1);
    expect(
      personalizedGenerationJobRepository.createOrGetActiveJob
    ).not.toHaveBeenCalled();
  });
});

describe('personalized async accept path', () => {
  beforeEach(() => {
    process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED = 'true';
    stubSyncRepos();
  });

  afterEach(() => {
    contentStudioGateway.sendToContentStudio = originals.sendToContentStudio;
    courseRepository.create = originals.createCourse;
    topicRepository.create = originals.createTopic;
    moduleRepository.create = originals.createModule;
    lessonRepository.create = originals.createLesson;
    aiStructureGenerator.generateAIStructure = originals.generateAIStructure;
    personalizedGenerationJobRepository.createOrGetActiveJob =
      originals.createOrGetActiveJob;
    delete process.env.PERSONALIZED_ASYNC_GENERATION_ENABLED;
  });

  it('flag true → creates/reuses job and returns {} without CS/AI/hierarchy', async () => {
    personalizedGenerationJobRepository.createOrGetActiveJob = jest
      .fn()
      .mockResolvedValue({
        job: {
          id: 'job-1',
          status: 'pending',
          stage: 'accepted'
        },
        created: true
      });

    const payload = learnerPayload();
    const result = await handleLearnerAIIntegration(payload, {});

    expect(result).toEqual({});
    expect(
      personalizedGenerationJobRepository.createOrGetActiveJob
    ).toHaveBeenCalledWith({
      learnerUserId: 'learner-1',
      competencyTargetName: 'React',
      requestPayload: payload
    });
    expect(contentStudioGateway.sendToContentStudio).not.toHaveBeenCalled();
    expect(aiStructureGenerator.generateAIStructure).not.toHaveBeenCalled();
    expect(courseRepository.create).not.toHaveBeenCalled();
    expect(lessonRepository.create).not.toHaveBeenCalled();
  });

  it('duplicate active push → same job ACK {}', async () => {
    personalizedGenerationJobRepository.createOrGetActiveJob = jest
      .fn()
      .mockResolvedValue({
        job: {
          id: 'job-existing',
          status: 'processing',
          stage: 'waiting_for_content'
        },
        created: false
      });

    const result = await handleLearnerAIIntegration(learnerPayload(), {});
    expect(result).toEqual({});
    expect(
      personalizedGenerationJobRepository.createOrGetActiveJob
    ).toHaveBeenCalledTimes(1);
    expect(contentStudioGateway.sendToContentStudio).not.toHaveBeenCalled();
  });
});
