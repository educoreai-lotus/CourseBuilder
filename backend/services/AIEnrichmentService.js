import OpenAI from 'openai';

let cachedClient = null;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
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
  const client = getOpenAIClient();

  if (!client) {
    console.warn('AI enrichment skipped: OPENAI_API_KEY is not set.');
    return { ...defaultEnrichment };
  }
  const prompt = buildPrompt({ topicName, lessonName, description, skills });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('AI enrichment failed:', error);
    return { ...defaultEnrichment };
  }
}

export default {
  enrichLesson
};

