import { jest } from '@jest/globals';
import { searchRepos } from '../GitHubFetcher.js';

const originalFetch = global.fetch;

describe('GitHubFetcher', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GITHUB_TOKEN;
  });

  test('returns empty array when unauthorized and retries without token', async () => {
    process.env.GITHUB_TOKEN = 'invalid';

    global.fetch
      .mockResolvedValueOnce({
        status: 401,
        ok: false
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ items: [] })
      });

    const result = await searchRepos({ queries: ['node'] });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual([]);
  });
});

