import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_RESPONSE = Object.freeze({
  queries: {
    youtube: [],
    github: []
  },
  suggestedUrls: {
    youtube: [],
    github: []
  },
  tags: []
});

const fallbackFromTopic = ({ topic, skills }) => {
  const normalizedTopic = (topic || '').trim();
  const primarySkill = (skills && skills.find(Boolean)) || '';
  const base = [normalizedTopic, primarySkill].filter(Boolean).join(' ');
  const fallbackQuery = base || 'modern development';

  return {
    queries: {
      youtube: [fallbackQuery],
      github: [fallbackQuery]
    },
    suggestedUrls: {
      youtube: [],
      github: []
    },
    tags: [normalizedTopic, ...skills].filter(Boolean)
  };
};

const extractJsonPayload = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  let cleaned = rawText.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
};

const normalizeIntentPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { ...DEFAULT_RESPONSE };
  }

  const queries = payload.queries || {};
  const suggestedUrls = payload.suggestedUrls || {};
  const tags = Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [];

  return {
    queries: {
      youtube: Array.isArray(queries.youtube) ? queries.youtube.filter(Boolean) : [],
      github: Array.isArray(queries.github) ? queries.github.filter(Boolean) : []
    },
    suggestedUrls: {
      youtube: Array.isArray(suggestedUrls.youtube)
        ? suggestedUrls.youtube.filter(Boolean)
        : [],
      github: Array.isArray(suggestedUrls.github)
        ? suggestedUrls.github.filter(Boolean)
        : []
    },
    tags
  };
};

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

const buildPrompt = ({ topic, skills }) => {
  const skillList = Array.isArray(skills) && skills.length > 0 ? skills.join(', ') : 'None';

  return `
You are an expert learning experience curator.
Given:
- Topic: ${topic || 'N/A'}
- Key skills: ${skillList}

Produce ONLY valid JSON describing search intents for YouTube videos and GitHub repositories that help learners deepen their knowledge.

Format:
{
  "queries": {
    "youtube": ["query 1", "query 2"],
    "github": ["query 1", "query 2"]
  },
  "suggestedUrls": {
    "youtube": ["https://youtube.com/..."],
    "github": ["https://github.com/..."]
  },
  "tags": ["tag1", "tag2"]
}

Rules:
- All arrays should contain between 1 and 4 concise entries.
- Queries should include relevant modifiers (e.g., "intro", "crash course", "best practices", "2024") where helpful.
- Suggested URLs must be absolute HTTPS links if provided.
- Tags should be concise, lowercase keywords.
- Respond with JSON only. No commentary.
`;
};

export async function generateIntents({ topic, skills = [] } = {}) {
  const trimmedTopic = typeof topic === 'string' ? topic.trim() : '';
  const normalizedSkills = Array.isArray(skills)
    ? skills.map((skill) => (typeof skill === 'string' ? skill.trim() : '')).filter(Boolean)
    : [];

  const fallback = fallbackFromTopic({ topic: trimmedTopic, skills: normalizedSkills });

  const client = getGeminiClient();
  if (!client) {
    console.warn('GeminiIntentService skipped: GEMINI_API_KEY missing');
    return fallback;
  }

  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = buildPrompt({ topic: trimmedTopic, skills: normalizedSkills });
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const jsonPayload = extractJsonPayload(text);
    if (!jsonPayload) {
      throw new Error('Unable to extract JSON payload from Gemini response');
    }

    const parsed = JSON.parse(jsonPayload);
    const normalized = normalizeIntentPayload(parsed);

    if (
      normalized.queries.youtube.length === 0 &&
      normalized.queries.github.length === 0 &&
      normalized.suggestedUrls.youtube.length === 0 &&
      normalized.suggestedUrls.github.length === 0
    ) {
      return fallback;
    }

    return normalized;
  } catch (error) {
    console.error('GeminiIntentService failed:', error);
    return fallback;
  }
}

export default {
  generateIntents
};

// Exported for unit testing
export const __private__ = {
  extractJsonPayload,
  normalizeIntentPayload,
  fallbackFromTopic
};

