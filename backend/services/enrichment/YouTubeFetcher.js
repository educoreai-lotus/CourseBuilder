const YT_SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const YT_VIDEOS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';
const MAX_RESULTS_PER_QUERY = 5;
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

const hasSkillInTitle = (title, skills) => {
  if (!title || !skills || skills.length === 0) {
    return false;
  }

  const lowerTitle = title.toLowerCase();
  return skills.some((skill) => lowerTitle.includes(skill.toLowerCase()));
};

const computeRecencyBoost = (publishedAt) => {
  if (!publishedAt) {
    return 0;
  }

  const publishedDate = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedDate)) {
    return 0;
  }

  const now = Date.now();
  const ageInDays = (now - publishedDate) / (1000 * 60 * 60 * 24);

  if (ageInDays <= 30) return 1;
  if (ageInDays <= 180) return 0.75;
  if (ageInDays <= 365) return 0.5;
  if (ageInDays <= 730) return 0.25;
  return 0;
};

const scoreVideo = (video, skills) => {
  const views = Number(video.viewCount || 0);
  const viewScore = Math.log10(views + 1);
  const recency = computeRecencyBoost(video.publishedAt);
  const skillBonus = hasSkillInTitle(video.title, skills) ? 0.5 : 0;
  return viewScore + recency + skillBonus;
};

const normalizeVideo = (item) => ({
  id: item.id,
  title: item.title,
  url: `https://www.youtube.com/watch?v=${item.id}`,
  channelTitle: item.channelTitle,
  durationISO: item.duration,
  publishedAt: item.publishedAt,
  viewCount: item.viewCount,
  likeCount: item.likeCount
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

export async function searchYouTube({ queries = [], skills = [], maxItems = 6 } = {}) {
  if (!process.env.YOUTUBE_API_KEY) {
    console.warn('YouTubeFetcher skipped: YOUTUBE_API_KEY missing');
    return [];
  }

  const authKey = process.env.YOUTUBE_API_KEY;
  const limitedQueries = Array.isArray(queries) ? queries.filter(Boolean).slice(0, 4) : [];

  if (limitedQueries.length === 0) {
    return [];
  }

  try {
    const videoIdSet = new Set();
    const preliminaryItems = [];

    for (const query of limitedQueries) {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        maxResults: String(MAX_RESULTS_PER_QUERY),
        q: query,
        key: authKey
      });

      const searchResponse = await fetchWithTimeout(`${YT_SEARCH_ENDPOINT}?${searchParams}`);
      if (!searchResponse.ok) {
        console.warn('YouTube search failed:', searchResponse.status, query);
        continue;
      }

      const searchJson = await searchResponse.json();
      const items = Array.isArray(searchJson.items) ? searchJson.items : [];

      items.forEach((item) => {
        const videoId = item?.id?.videoId;
        if (videoId) {
          videoIdSet.add(videoId);
        }
      });
    }

    const videoIds = Array.from(videoIdSet);
    if (videoIds.length === 0) {
      return [];
    }

    const chunkSize = 45;
    for (let i = 0; i < videoIds.length; i += chunkSize) {
      const chunk = videoIds.slice(i, i + chunkSize);
      const videoParams = new URLSearchParams({
        part: 'snippet,contentDetails,statistics',
        id: chunk.join(','),
        key: authKey
      });

      const videosResponse = await fetchWithTimeout(`${YT_VIDEOS_ENDPOINT}?${videoParams}`);
      if (!videosResponse.ok) {
        console.warn('YouTube video details failed:', videosResponse.status);
        continue;
      }

      const videosJson = await videosResponse.json();
      const videoItems = Array.isArray(videosJson.items) ? videosJson.items : [];

      videoItems.forEach((video) => {
        const id = video?.id;
        if (!id) {
          return;
        }

        preliminaryItems.push({
          id,
          title: video?.snippet?.title || 'Untitled',
          channelTitle: video?.snippet?.channelTitle || 'Unknown channel',
          duration: video?.contentDetails?.duration || null,
          publishedAt: video?.snippet?.publishedAt || null,
          viewCount: Number(video?.statistics?.viewCount || 0),
          likeCount: Number(video?.statistics?.likeCount || 0)
        });
      });
    }

    const uniqueItems = uniqById(preliminaryItems);
    const scored = uniqueItems
      .map((item) => ({
        ...item,
        score: scoreVideo(item, skills)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems);

    return scored.map(normalizeVideo);
  } catch (error) {
    console.error('YouTubeFetcher encountered an error:', error);
    return [];
  }
}

export default {
  searchYouTube
};

export const __private__ = {
  hasSkillInTitle,
  computeRecencyBoost,
  scoreVideo,
  uniqById,
  normalizeVideo
};

