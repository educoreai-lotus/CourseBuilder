import { jest } from '@jest/globals';

const mockResponsePayload = {
  summary: 'This lesson covers the essentials.',
  learning_objectives: ['Understand basics', 'Apply concepts', 'Evaluate outcomes'],
  examples: ['Example A', 'Example B'],
  difficulty: 'Intermediate',
  estimated_duration_minutes: 45,
  tags: ['sample'],
  recommendations: ['Review previous module']
};

jest.unstable_mockModule('openai', () => {
  return {
    default: class MockOpenAI {
      constructor() {
        this.chat = {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockResponsePayload)
                  }
                }
              ]
            })
          }
        };
      }
    }
  };
});

const { enrichLesson } = await import('../AIEnrichmentService.js');

describe('AIEnrichmentService', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    jest.clearAllMocks();
  });

  test('returns parsed enrichment payload when OpenAI succeeds', async () => {
    const result = await enrichLesson({
      topicName: 'Testing',
      lessonName: 'Unit Testing Basics',
      description: 'Learn how to test functions.',
      skills: ['testing']
    });

    expect(result).toEqual(mockResponsePayload);
  });

  test('returns default payload when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await enrichLesson({
      topicName: 'Testing',
      lessonName: 'Unit Testing Basics'
    });

    expect(result.summary).toBe('Enrichment unavailable');
    expect(result.learning_objectives).toEqual([]);
  });
});

