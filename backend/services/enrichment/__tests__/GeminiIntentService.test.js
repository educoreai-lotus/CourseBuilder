import { jest } from '@jest/globals';

const mockGenerateContent = jest.fn();

jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGenAI {
    constructor() {
      this.getGenerativeModel = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      });
    }
  }
}));

const { generateIntents, __private__ } = await import('../GeminiIntentService.js');

describe('GeminiIntentService', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'fake-key';
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  test('parses JSON payload wrapped in markdown fences', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => `\`\`\`json
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
    });

    const result = await generateIntents({ topic: 'React Hooks', skills: ['react'] });

    expect(result.queries.youtube).toContain('react hooks tutorial');
    expect(result.suggestedUrls.github).toContain('https://github.com/facebook/react');
    expect(result.tags).toEqual(['react', 'hooks']);
  });

  test('falls back to simple query when JSON parsing fails', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'invalid payload'
      }
    });

    const result = await generateIntents({ topic: 'GraphQL', skills: ['api'] });

    expect(result.queries.youtube[0]).toMatch(/GraphQL/i);
    expect(result.tags).toContain('GraphQL');
  });

  test('extractJsonPayload handles null input', () => {
    expect(__private__.extractJsonPayload(null)).toBeNull();
  });
});

