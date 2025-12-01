import OpenAI from 'openai';

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
  const skillArray = Array.isArray(skills) ? skills.filter(Boolean) : [];
  
  // Generate multiple search queries for better results
  const baseQuery = normalizedTopic || 'programming';
  const youtubeQueries = [];
  const githubQueries = [];
  
  // YouTube queries with modifiers
  if (normalizedTopic) {
    youtubeQueries.push(`${normalizedTopic} tutorial`);
    youtubeQueries.push(`${normalizedTopic} best practices`);
    if (skillArray.length > 0) {
      youtubeQueries.push(`${normalizedTopic} ${skillArray[0]} tutorial`);
    }
  } else if (skillArray.length > 0) {
    youtubeQueries.push(`${skillArray[0]} tutorial`);
  }
  
  // GitHub queries
  if (normalizedTopic) {
    githubQueries.push(normalizedTopic);
    if (skillArray.length > 0) {
      githubQueries.push(`${normalizedTopic} ${skillArray[0]}`);
    }
  } else if (skillArray.length > 0) {
    githubQueries.push(skillArray[0]);
  }
  
  // Ensure we have at least one query
  if (youtubeQueries.length === 0) {
    youtubeQueries.push('programming tutorial');
  }
  if (githubQueries.length === 0) {
    githubQueries.push('programming');
  }

  return {
    queries: {
      youtube: youtubeQueries.slice(0, 3),
      github: githubQueries.slice(0, 3)
    },
    suggestedUrls: {
      youtube: [],
      github: []
    },
    tags: [normalizedTopic, ...skillArray].filter(Boolean).slice(0, 5)
  };
};

const extractJsonPayload = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  // Clean markdown fences before extracting JSON
  let cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

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

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return cachedClient;
};

const buildPrompt = ({ topic, skills }) => {
  const skillList = Array.isArray(skills) && skills.length > 0 ? skills.join(', ') : 'None';

  return `You are an expert learning experience curator.
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
- Respond with JSON only. No commentary.`;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callOpenAIWithRetry = async (client, prompt) => {
  const MAX_RETRIES = 5;
  const delays = [1000, 2000, 4000, 8000, 16000];
  let lastError = null;

  // Add jitter delay before request to prevent overload bursts
  await new Promise(r => setTimeout(r, 100 + Math.random() * 400));

  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[OpenAI] Using model: ${modelName}`);
      
      const response = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: 'You are an AI enrichment generator. Respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
      
      let text = response?.choices?.[0]?.message?.content;
      
      if (!text) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Clean markdown fences before returning
      text = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      
      return text;
    } catch (err) {
      lastError = err;
      
      const retryable =
        err.message?.includes('503') ||
        err.message?.includes('overloaded') ||
        err.message?.includes('429') ||
        err.message?.includes('408') ||
        err.message?.includes('rate_limit') ||
        err.status === 503 ||
        err.status === 429 ||
        err.status === 408;

      if (!retryable || attempt === MAX_RETRIES) {
        throw err;
      }

      console.warn(`[OpenAI] Retryable error (attempt ${attempt}/${MAX_RETRIES}), waiting ${delays[attempt - 1]}ms`);
      await delay(delays[attempt - 1]);
    }
  }

  throw lastError;
};

export async function generateIntents({ topic, skills = [] } = {}) {
  const trimmedTopic = typeof topic === 'string' ? topic.trim() : '';
  const normalizedSkills = Array.isArray(skills)
    ? skills.map((skill) => (typeof skill === 'string' ? skill.trim() : '')).filter(Boolean)
    : [];

  const fallback = fallbackFromTopic({ topic: trimmedTopic, skills: normalizedSkills });

  const client = getOpenAIClient();
  if (!client) {
    console.warn('[OpenAI] OPENAI_API_KEY missing, using fallback enrichment');
    return fallback;
  }

  const prompt = buildPrompt({ topic: trimmedTopic, skills: normalizedSkills });

  try {
    const text = await callOpenAIWithRetry(client, prompt);
    
    // Text is already cleaned in callOpenAIWithRetry, but ensure it's valid JSON
    const jsonPayload = extractJsonPayload(text);
    if (!jsonPayload) {
      throw new Error('Unable to extract JSON payload from OpenAI response');
    }

    // Clean and parse JSON
    let cleaned = jsonPayload
      .replace(/^```json/i, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const normalized = normalizeIntentPayload(parsed);

    if (
      normalized.queries.youtube.length === 0 &&
      normalized.queries.github.length === 0 &&
      normalized.suggestedUrls.youtube.length === 0 &&
      normalized.suggestedUrls.github.length === 0
    ) {
      console.warn('[OpenAI] Model returned empty results, using fallback');
      return fallback;
    }

    console.log('[OpenAI] Successfully generated intents');
    return normalized;
  } catch (error) {
    console.error('[OpenAI] All OpenAI models failed, using manual fallback enrichment.');
    console.error('[OpenAI] Error details:', error.message);
    return fallback;
  }
}

export async function runOpenAI(prompt) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OPENAI_API_KEY not configured. Cannot generate AI content.');
  }

  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  
  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are an AI enrichment generator.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('[OpenAI] runOpenAI error:', error.message);
    throw error;
  }
}

export default {
  generateIntents,
  runOpenAI
};

// Exported for unit testing
export const __private__ = {
  extractJsonPayload,
  normalizeIntentPayload,
  fallbackFromTopic
};
