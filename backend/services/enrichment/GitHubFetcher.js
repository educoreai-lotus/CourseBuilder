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

const rankRepos = (repos) =>
  [...repos].sort((a, b) => {
    if (b.stars !== a.stars) {
      return b.stars - a.stars;
    }
    const dateA = a.lastCommit ? new Date(a.lastCommit).getTime() : 0;
    const dateB = b.lastCommit ? new Date(b.lastCommit).getTime() : 0;
    return dateB - dateA;
  });

export async function searchRepos({ queries = [], maxItems = 6, _retryWithoutAuth = false } = {}) {
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
    return rankRepos(unique).slice(0, maxItems);
  } catch (error) {
    console.error('GitHubFetcher encountered an error:', error);
    return [];
  }
}

export default {
  searchRepos
};

export const __private__ = {
  normalizeRepo,
  uniqById,
  rankRepos
};

