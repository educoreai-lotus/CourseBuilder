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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error) => {
  if (!error) return false;
  
  // Check various error properties
  const status = error.status || error.statusCode || (error.response && error.response.status);
  const statusText = (error.statusText || '').toLowerCase();
  const message = (error.message || '').toLowerCase();
  const errorDetails = (error.errorDetails || '').toLowerCase();
  
  // Retry on 503 (Service Unavailable), 429 (Rate Limit), 500 (Internal Server Error)
  const isRetryableStatus = status === 503 || status === 429 || status === 500;
  const isOverloaded = statusText.includes('overloaded') || 
                       message.includes('overloaded') ||
                       errorDetails.includes('overloaded') ||
                       message.includes('try again later');
  
  return isRetryableStatus || isOverloaded;
};

const callGeminiWithRetry = async (client, modelName, prompt, maxRetries = 3) => {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Use v1 API - the SDK uses v1 by default
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      let text = result?.response?.text?.();
      
      if (!text) {
        throw new Error('Empty response from Gemini');
      }
      
      // Clean markdown fences before returning
      text = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      
      return text;
    } catch (error) {
      lastError = error;
      
      // If it's a retryable error and we have retries left, wait and retry
      if (isRetryableError(error) && attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
        console.warn(`[GeminiIntentService] Retryable error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${backoffMs}ms:`, error.message);
        await delay(backoffMs);
        continue;
      }
      
      // If not retryable or out of retries, throw
      throw error;
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

  const client = getGeminiClient();
  if (!client) {
    console.warn('GeminiIntentService skipped: GEMINI_API_KEY missing');
    return fallback;
  }

  // Use only free models that work with v1 API
  // gemini-pro and other premium models require subscription
  // For v1 API, use: gemini-2.5-flash (free tier)
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const modelsToTry = [primaryModel];
  
  // Try alternative model names that work with v1 API
  const alternativeModels = ['gemini-2.5-flash'];
  for (const altModel of alternativeModels) {
    if (!modelsToTry.includes(altModel)) {
      modelsToTry.push(altModel);
    }
  }

  const prompt = buildPrompt({ topic: trimmedTopic, skills: normalizedSkills });

  for (const modelName of modelsToTry) {
    try {
      console.log(`[GeminiIntentService] Using Gemini model: ${modelName}`);
      const text = await callGeminiWithRetry(client, modelName, prompt);
      
      // Text is already cleaned in callGeminiWithRetry, but ensure it's valid JSON
      const jsonPayload = extractJsonPayload(text);
      if (!jsonPayload) {
        throw new Error('Unable to extract JSON payload from Gemini response');
      }

      // Parse the cleaned JSON
      const parsed = JSON.parse(jsonPayload);
      const normalized = normalizeIntentPayload(parsed);

      if (
        normalized.queries.youtube.length === 0 &&
        normalized.queries.github.length === 0 &&
        normalized.suggestedUrls.youtube.length === 0 &&
        normalized.suggestedUrls.github.length === 0
      ) {
        console.warn(`[GeminiIntentService] Model ${modelName} returned empty results, using fallback`);
        return fallback;
      }

      console.log(`[GeminiIntentService] Successfully generated intents with ${modelName}`);
      return normalized;
    } catch (error) {
      console.error(`[GeminiIntentService] Model ${modelName} failed:`, error.message);
      
      // If this is the last model to try, return fallback
      if (modelName === modelsToTry[modelsToTry.length - 1]) {
        console.warn('[GeminiIntentService] All models failed, using fallback queries');
        return fallback;
      }
      
      // Otherwise, try the next model
      const nextModelIndex = modelsToTry.indexOf(modelName) + 1;
      if (nextModelIndex < modelsToTry.length) {
        console.log(`[GeminiIntentService] Trying fallback model: ${modelsToTry[nextModelIndex]}`);
      }
      continue;
    }
  }

  return fallback;
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

