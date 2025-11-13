const GITHUB_SEARCH_ENDPOINT = 'https://api.github.com/search/repositories';
const FETCH_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url, options = {}, attempt = 0) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (response.status === 429 && attempt === 0) {
      await delay(RETRY_DELAY_MS);
      return fetchWithTimeout(url, options, attempt + 1);
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

const computeTopicRelevance = (name, description, topics, topic) => {
  if (!topic) return 0;
  
  const lowerTopic = topic.toLowerCase();
  const lowerName = (name || '').toLowerCase();
  const lowerDesc = (description || '').toLowerCase();
  const lowerTopics = (topics || []).map(t => t.toLowerCase()).join(' ');
  const combined = `${lowerName} ${lowerDesc} ${lowerTopics}`;
  
  // Split topic into words
  const topicWords = lowerTopic.split(/\s+/).filter(w => w.length > 2);
  
  // Count matching words
  let matches = 0;
  topicWords.forEach(word => {
    if (combined.includes(word)) {
      matches += 1;
    }
  });
  
  // Return relevance score (0-2 points max)
  return Math.min(matches * 0.5, 2);
};

const normalizeRepo = (repo) => ({
  id: repo.id,
  name: repo.full_name || repo.name,
  url: repo.html_url,
  description: repo.description,
  stars: repo.stargazers_count,
  lastCommit: repo.pushed_at,
  language: repo.language,
  topics: Array.isArray(repo.topics) ? repo.topics : []
});

const uniqById = (items) => {
  const map = new Map();
  items.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
};

const rankRepos = (repos, topic = '') => {
  return [...repos]
    .map(repo => ({
      ...repo,
      relevanceScore: computeTopicRelevance(repo.name, repo.description, repo.topics, topic)
    }))
    .sort((a, b) => {
      // Prioritize relevance, then stars, then recency
      if (Math.abs(b.relevanceScore - a.relevanceScore) > 0.5) {
        return b.relevanceScore - a.relevanceScore;
      }
      if (b.stars !== a.stars) {
        return b.stars - a.stars;
      }
      const dateA = a.lastCommit ? new Date(a.lastCommit).getTime() : 0;
      const dateB = b.lastCommit ? new Date(b.lastCommit).getTime() : 0;
      return dateB - dateA;
    });
};

export async function searchRepos({ queries = [], topic = '', maxItems = 4, _retryWithoutAuth = false } = {}) {
  const limitedQueries = Array.isArray(queries) ? queries.filter(Boolean).slice(0, 4) : [];
  if (limitedQueries.length === 0) {
    return [];
  }

  const headers = {
    Accept: 'application/vnd.github+json'
  };

  if (!_retryWithoutAuth && process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const collected = [];

    for (const query of limitedQueries) {
      const searchParams = new URLSearchParams({
        q: `${query} stars:>50`,
        sort: 'stars',
        order: 'desc',
        per_page: '10'
      });

      const response = await fetchWithTimeout(`${GITHUB_SEARCH_ENDPOINT}?${searchParams}`, {
        headers
      });

      if (response.status === 401 || response.status === 403) {
        if (!_retryWithoutAuth && process.env.GITHUB_TOKEN) {
          console.warn('GitHubFetcher auth failed, retrying without token');
          await delay(RETRY_DELAY_MS);
          return searchRepos({ queries: limitedQueries, maxItems, _retryWithoutAuth: true });
        }
        console.warn('GitHubFetcher unauthorized, skipping query:', query);
        continue;
      }

      if (response.status === 429) {
        console.warn('GitHubFetcher rate-limited, delaying');
        await delay(RETRY_DELAY_MS);
        continue;
      }

      if (!response.ok) {
        console.warn('GitHubFetcher failed:', response.status, query);
        continue;
      }

      const data = await response.json();
      const repos = Array.isArray(data.items) ? data.items : [];

      repos.forEach((repo) => {
        collected.push(normalizeRepo(repo));
      });
    }

    const unique = uniqById(collected);
    const ranked = rankRepos(unique, topic);
    
    // Filter out low-relevance items (relevanceScore < 0.5) unless we have very few results
    const filtered = ranked.length >= 3
      ? ranked.filter(repo => repo.relevanceScore >= 0.5)
      : ranked;
    
    return filtered.slice(0, maxItems).map(({ relevanceScore, ...repo }) => repo);
  } catch (error) {
    console.error('GitHubFetcher encountered an error:', error);
    return [];
  }
}

export default {
  searchRepos
};

export const __private__ = {
  computeTopicRelevance,
  normalizeRepo,
  uniqById,
  rankRepos
};

