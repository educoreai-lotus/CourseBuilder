import { GoogleGenerativeAI } from '@google/generative-ai';

let cachedClient = null;

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  return cachedClient;
};

const buildPrompt = ({ topicName, lessonName, description, skills }) => `
You are an expert course designer.
Given the following lesson information:
- Topic: ${topicName || 'N/A'}
- Lesson: ${lessonName || 'N/A'}
- Description: ${description || 'No description'}
- Skills: ${(skills && skills.length > 0 ? skills.join(', ') : 'None provided')}

Generate a structured JSON with:
{
  "summary": "A short 2–3 sentence overview of the lesson",
  "learning_objectives": ["...", "...", "..."],
  "examples": ["Example 1", "Example 2"],
  "difficulty": "Beginner | Intermediate | Advanced",
  "estimated_duration_minutes": number,
  "tags": ["optional tags"],
  "recommendations": ["optional follow-up recommendations"]
}
Make sure your response is valid JSON only. No extra text.
`;

const defaultEnrichment = {
  summary: 'Enrichment unavailable',
  learning_objectives: [],
  examples: [],
  difficulty: 'unknown',
  estimated_duration_minutes: null,
  tags: [],
  recommendations: []
};

export async function enrichLesson({
  topicName,
  lessonName,
  description,
  skills = []
}) {
  const client = getGeminiClient();

  if (!client) {
    console.warn('AI enrichment skipped: GEMINI_API_KEY is not set.');
    return { ...defaultEnrichment };
  }
  const prompt = buildPrompt({ topicName, lessonName, description, skills });

  try {
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text);
    return {
      ...defaultEnrichment,
      ...parsed
    };
  } catch (error) {
    console.error('Gemini enrichment failed:', error);
    return { ...defaultEnrichment };
  }
}

export default {
  enrichLesson
};

