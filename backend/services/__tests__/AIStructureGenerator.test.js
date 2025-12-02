import { jest } from '@jest/globals';

const mockCreate = jest.fn();

jest.unstable_mockModule('openai', () => ({
  default: class MockOpenAI {
    constructor() {
      this.chat = {
        completions: {
          create: mockCreate
        }
      };
    }
  }
}));

const { generateAIStructure } = await import('../AIStructureGenerator.js');

describe('AIStructureGenerator', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'fake-key';
    mockCreate.mockReset();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  const mockLessons = [
    {
      lessonId: 'lesson_1',
      lessonName: 'Introduction to React',
      description: 'Learn the basics of React framework',
      content_data: [{ content: 'React is a JavaScript library' }],
      skills: ['react', 'javascript']
    },
    {
      lessonId: 'lesson_2',
      lessonName: 'React Components',
      description: 'Understanding React components',
      content_data: [{ content: 'Components are reusable pieces' }],
      skills: ['react']
    },
    {
      lessonId: 'lesson_3',
      lessonName: 'State Management',
      description: 'Managing state in React',
      content_data: [{ content: 'State allows components to change' }],
      skills: ['react', 'state']
    },
    {
      lessonId: 'lesson_4',
      lessonName: 'React Hooks',
      description: 'Using hooks in React',
      content_data: [{ content: 'Hooks are functions that let you use state' }],
      skills: ['react', 'hooks']
    },
    {
      lessonId: 'lesson_5',
      lessonName: 'Advanced Patterns',
      description: 'Advanced React patterns',
      content_data: [{ content: 'Advanced patterns for complex apps' }],
      skills: ['react', 'advanced']
    },
    {
      lessonId: 'lesson_6',
      lessonName: 'Testing React',
      description: 'Testing React applications',
      content_data: [{ content: 'Testing is important for quality' }],
      skills: ['react', 'testing']
    }
  ];

  const mockLearningPath = [
    { topicName: 'React Fundamentals' },
    { topicName: 'Advanced React' }
  ];

  test('generates structure from lesson content', async () => {
    const mockAIResponse = {
      topics: [
        {
          topic_name: 'Introduction to React',
          topic_description: 'Basics of React framework',
          modules: [
            {
              module_name: 'React Basics',
              module_description: 'Fundamental concepts',
              lesson_ids: ['lesson_1', 'lesson_2']
            },
            {
              module_name: 'State and Hooks',
              module_description: 'Managing state',
              lesson_ids: ['lesson_3', 'lesson_4']
            }
          ]
        },
        {
          topic_name: 'Advanced React',
          topic_description: 'Advanced concepts',
          modules: [
            {
              module_name: 'Advanced Patterns',
              module_description: 'Complex patterns',
              lesson_ids: ['lesson_5']
            },
            {
              module_name: 'Testing',
              module_description: 'Testing strategies',
              lesson_ids: ['lesson_6']
            }
          ]
        }
      ]
    };

    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify(mockAIResponse)
        }
      }]
    });

    const result = await generateAIStructure({
      learningPath: mockLearningPath,
      skills: ['react'],
      allLessons: mockLessons
    });

    expect(result.isValid).toBe(true);
    expect(result.source).toBe('ai-generated');
    expect(result.structure.topics).toHaveLength(2);
    expect(result.structure.topics[0].modules).toHaveLength(2);
    expect(result.structure.topics[0].topic_name).toBe('Introduction to React');
  });

  test('uses fallback structure when no lessons provided', async () => {
    const result = await generateAIStructure({
      learningPath: mockLearningPath,
      skills: ['react'],
      allLessons: []
    });

    expect(result.source).toBe('fallback');
    expect(result.isValid).toBe(true);
    expect(result.structure.topics).toBeDefined();
  });

  test('uses fallback structure when OpenAI API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await generateAIStructure({
      learningPath: mockLearningPath,
      skills: ['react'],
      allLessons: mockLessons
    });

    expect(result.source).toBe('fallback');
    expect(result.isValid).toBe(true);
  });

  test('uses fallback structure when OpenAI API call fails', async () => {
    mockCreate.mockRejectedValue(new Error('API Error'));

    const result = await generateAIStructure({
      learningPath: mockLearningPath,
      skills: ['react'],
      allLessons: mockLessons
    });

    expect(result.source).toBe('fallback');
    expect(result.isValid).toBe(true);
  });

  test('uses fallback structure when AI response is invalid JSON', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: 'This is not valid JSON'
        }
      }]
    });

    const result = await generateAIStructure({
      learningPath: mockLearningPath,
      skills: ['react'],
      allLessons: mockLessons
    });

    expect(result.source).toBe('fallback');
    expect(result.isValid).toBe(true);
  });

  test('uses fallback structure when validation fails (missing lesson)', async () => {
    const invalidResponse = {
      topics: [
        {
          topic_name: 'React Basics',
          modules: [
            {
              module_name: 'Intro',
              lesson_ids: ['lesson_1', 'lesson_2', 'missing_lesson']
            }
          ]
        }
      ]
    };

    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify(invalidResponse)
        }
      }]
    });

    const result = await generateAIStructure({
      learningPath: mockLearningPath,
      skills: ['react'],
      allLessons: mockLessons
    });

    // Should fallback due to validation failure
    expect(result.source).toBe('fallback');
    expect(result.isValid).toBe(true);
  });

  test('handles lessons with different content formats', async () => {
    const lessonsWithVariedFormats = [
      {
        id: 'lesson_1',
        title: 'Lesson 1',
        summary: 'Lesson summary',
        content_data: 'Simple string content'
      },
      {
        lessonId: 'lesson_2',
        lessonName: 'Lesson 2',
        description: 'Lesson description',
        content_data: [{ content: 'Array content' }]
      },
      {
        lessonId: 'lesson_3',
        name: 'Lesson 3',
        content_data: [{ text: 'Text content' }]
      }
    ];

    const mockAIResponse = {
      topics: [
        {
          topic_name: 'Mixed Content',
          modules: [
            {
              module_name: 'All Lessons',
              lesson_ids: ['lesson_1', 'lesson_2', 'lesson_3']
            }
          ]
        }
      ]
    };

    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify(mockAIResponse)
        }
      }]
    });

    const result = await generateAIStructure({
      learningPath: [{ topicName: 'Test Topic' }],
      skills: [],
      allLessons: lessonsWithVariedFormats
    });

    expect(result.isValid).toBe(true);
    expect(result.source).toBe('ai-generated');
  });

  test('handles OpenAI response with markdown fences', async () => {
    const mockAIResponse = {
      topics: [
        {
          topic_name: 'React Basics',
          modules: [
            {
              module_name: 'Intro',
              lesson_ids: ['lesson_1']
            }
          ]
        }
      ]
    };

    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: `\`\`\`json
${JSON.stringify(mockAIResponse)}
\`\`\``
        }
      }]
    });

    const result = await generateAIStructure({
      learningPath: mockLearningPath,
      skills: ['react'],
      allLessons: [mockLessons[0]]
    });

    expect(result.isValid).toBe(true);
    expect(result.source).toBe('ai-generated');
    expect(result.structure.topics[0].topic_name).toBe('React Basics');
  });

  test('calls OpenAI with correct parameters', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            topics: [
              {
                topic_name: 'Test Topic',
                modules: [
                  {
                    module_name: 'Test Module',
                    lesson_ids: ['lesson_1']
                  }
                ]
              }
            ]
          })
        }
      }]
    });

    await generateAIStructure({
      learningPath: mockLearningPath,
      skills: ['react', 'javascript'],
      allLessons: [mockLessons[0]]
    });

    expect(mockCreate).toHaveBeenCalled();
    const callArgs = mockCreate.mock.calls[0][0];
    
    expect(callArgs.model).toBe(process.env.OPENAI_MODEL || 'gpt-4o-mini');
    expect(callArgs.temperature).toBe(0.3);
    expect(callArgs.response_format).toEqual({ type: 'json_object' });
    expect(callArgs.messages[0].role).toBe('system');
    expect(callArgs.messages[1].role).toBe('user');
    expect(callArgs.messages[1].content).toContain('Lesson Contents');
  });

  test('includes learning path and skills in prompt', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            topics: [
              {
                topic_name: 'Test',
                modules: [
                  {
                    module_name: 'Module',
                    lesson_ids: ['lesson_1']
                  }
                ]
              }
            ]
          })
        }
      }]
    });

    await generateAIStructure({
      learningPath: [{ topicName: 'React Fundamentals' }, { topicName: 'Advanced React' }],
      skills: ['react', 'javascript', 'state'],
      allLessons: [mockLessons[0]]
    });

    const prompt = mockCreate.mock.calls[0][0].messages[1].content;
    
    expect(prompt).toContain('React Fundamentals');
    expect(prompt).toContain('Advanced React');
    expect(prompt).toContain('react, javascript, state');
  });
});

