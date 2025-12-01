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

const { generateIntents, __private__ } = await import('../OpenAIIntentService.js');

describe('OpenAIIntentService', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'fake-key';
    mockCreate.mockReset();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  test('parses JSON payload wrapped in markdown fences', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: `\`\`\`json
{
  "queries": {
    "youtube": ["react hooks tutorial"],
    "github": ["react hooks starter"]
  },
  "suggestedUrls": {
    "youtube": ["https://youtube.com/watch?v=test"],
    "github": ["https://github.com/facebook/react"]
  },
  "tags": ["react", "hooks"]
}
\`\`\``
        }
      }]
    });

    const result = await generateIntents({ topic: 'React Hooks', skills: ['react'] });

    expect(result.queries.youtube).toContain('react hooks tutorial');
    expect(result.suggestedUrls.github).toContain('https://github.com/facebook/react');
    expect(result.tags).toEqual(['react', 'hooks']);
  });

  test('falls back to simple query when JSON parsing fails', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: 'invalid payload'
        }
      }]
    });

    const result = await generateIntents({ topic: 'GraphQL', skills: ['api'] });

    expect(result.queries.youtube[0]).toMatch(/GraphQL/i);
    expect(result.tags).toContain('GraphQL');
  });

  test('extractJsonPayload handles null input', () => {
    expect(__private__.extractJsonPayload(null)).toBeNull();
  });
});
