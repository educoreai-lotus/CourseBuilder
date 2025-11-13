import crypto from 'crypto';
import { generateIntents } from './GeminiIntentService.js';
import { searchYouTube } from './YouTubeFetcher.js';
import { searchRepos } from './GitHubFetcher.js';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TOTAL_TIMEOUT_MS = 25 * 1000;

const enrichmentCache = new Map();

const cacheKeyFor = ({ topic, skills = [], maxItems }) => {
  const normalizedTopic = typeof topic === 'string' ? topic.trim().toLowerCase() : '';
  const normalizedSkills = Array.isArray(skills)
    ? skills.map((skill) => skill.trim().toLowerCase()).sort()
    : [];

  const hash = crypto
    .createHash('sha1')
    .update(JSON.stringify({ topic: normalizedTopic, skills: normalizedSkills, maxItems }))
    .digest('hex');

  return hash;
};

const isCacheEntryValid = (entry) => entry && entry.expiresAt > Date.now();

const validateUrl = (url) => {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch (error) {
    return false;
  }
};

const sanitizeSuggestedUrls = (urls = []) =>
  urls.filter((url) => typeof url === 'string' && validateUrl(url));

const withOverallTimeout = async (promise) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS);

  try {
    // We do not pass the controller downstream because each fetcher manages its own timeout.
    return await promise;
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.error('AssetEnrichmentService timed out');
      return {
        tags: [],
        videos: [],
        repos: [],
        source: 'gemini+apis',
        generatedAt: new Date().toISOString()
      };
    } else {
      throw error;
    }
  } finally {
    clearTimeout(timeoutId);
  }
};

export async function enrichAssets({ topic, skills = [], maxItems = 6 } = {}) {
  const key = cacheKeyFor({ topic, skills, maxItems });
  const cached = enrichmentCache.get(key);

  if (isCacheEntryValid(cached)) {
    console.log('[AssetEnrichmentService] Returning cached result for:', topic);
    return cached.payload;
  }

  const operation = async () => {
    console.log('[AssetEnrichmentService] Starting enrichment for:', { topic, skillsCount: skills.length });
    
    let intents;
    try {
      intents = await generateIntents({ topic, skills });
      console.log('[AssetEnrichmentService] Intents generated:', {
        youtubeQueries: intents.queries.youtube.length,
        githubQueries: intents.queries.github.length,
        tagsCount: intents.tags.length
      });
    } catch (error) {
      // generateIntents should never throw (it returns fallback), but be defensive
      console.error('[AssetEnrichmentService] Failed to generate intents, using fallback:', error.message);
      // Generate a basic fallback if generateIntents somehow throws
      intents = {
        queries: {
          youtube: [`${topic || 'programming'} tutorial`],
          github: [topic || 'programming']
        },
        suggestedUrls: { youtube: [], github: [] },
        tags: [topic, ...skills].filter(Boolean).slice(0, 5)
      };
    }

    const [videos, repos] = await Promise.all([
      searchYouTube({
        queries: intents.queries.youtube,
        skills,
        maxItems
      }).catch((error) => {
        console.error('[AssetEnrichmentService] YouTube search failed:', error);
        return [];
      }),
      searchRepos({
        queries: intents.queries.github,
        maxItems
      }).catch((error) => {
        console.error('[AssetEnrichmentService] GitHub search failed:', error);
        return [];
      })
    ]);

    const sanitizedSuggested = {
      youtube: sanitizeSuggestedUrls(intents.suggestedUrls.youtube),
      github: sanitizeSuggestedUrls(intents.suggestedUrls.github)
    };

    const payload = {
      tags: intents.tags,
      videos,
      repos,
      suggestedUrls: sanitizedSuggested,
      source: 'gemini+apis',
      generatedAt: new Date().toISOString()
    };

    enrichmentCache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload
    });

    console.log('[AssetEnrichmentService] Enrichment completed:', {
      videosCount: videos.length,
      reposCount: repos.length,
      tagsCount: payload.tags.length
    });

    return payload;
  };

  try {
    return await withOverallTimeout(operation());
  } catch (error) {
    console.error('[AssetEnrichmentService] Enrichment operation failed:', error);
    // Return a minimal response instead of throwing to prevent frontend crashes
    return {
      tags: [],
      videos: [],
      repos: [],
      suggestedUrls: { youtube: [], github: [] },
      source: 'gemini+apis',
      generatedAt: new Date().toISOString(),
      error: error.message
    };
  }
}

export function clearCache() {
  enrichmentCache.clear();
}

export default {
  enrichAssets,
  clearCache
};

export const __private__ = {
  cacheKeyFor,
  isCacheEntryValid,
  sanitizeSuggestedUrls
};

