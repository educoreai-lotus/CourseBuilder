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
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.();
      
      if (!text) {
        throw new Error('Empty response from Gemini');
      }
      
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

  // Use only free models (gemini-1.5-flash is free tier)
  // gemini-pro and gemini-1.5-pro require subscription
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const modelsToTry = [primaryModel];
  
  // Only add gemini-1.5-flash as fallback if primary is different
  if (primaryModel !== 'gemini-1.5-flash') {
    modelsToTry.push('gemini-1.5-flash');
  }

  const prompt = buildPrompt({ topic: trimmedTopic, skills: normalizedSkills });

  for (const modelName of modelsToTry) {
    try {
      console.log(`[GeminiIntentService] Attempting with model: ${modelName}`);
      const text = await callGeminiWithRetry(client, modelName, prompt);
      
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

