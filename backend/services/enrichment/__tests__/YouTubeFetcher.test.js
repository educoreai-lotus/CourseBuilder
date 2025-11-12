import { __private__ as ytPrivate } from '../YouTubeFetcher.js';

describe('YouTubeFetcher helpers', () => {
  test('uniqById removes duplicates', () => {
    const items = [
      { id: 'abc', title: 'First' },
      { id: 'abc', title: 'Duplicate' },
      { id: 'def', title: 'Second' }
    ];

    const unique = ytPrivate.uniqById(items);
    expect(unique).toHaveLength(2);
    expect(unique.find((item) => item.id === 'abc').title).toBe('First');
  });

  test('scoreVideo rewards recent and skill-matching titles', () => {
    const recent = {
      id: 'recent',
      title: 'Docker best practices tutorial',
      publishedAt: new Date().toISOString(),
      viewCount: 10_000,
      likeCount: 100
    };

    const older = {
      id: 'older',
      title: 'Random topic',
      publishedAt: '2018-01-01T00:00:00Z',
      viewCount: 50_000,
      likeCount: 500
    };

    const recentScore = ytPrivate.scoreVideo(recent, ['docker']);
    const olderScore = ytPrivate.scoreVideo(older, ['docker']);

    expect(recentScore).toBeGreaterThan(olderScore);
  });
});

