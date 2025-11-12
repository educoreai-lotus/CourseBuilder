import { jest } from '@jest/globals';
import { enrichLesson, defaultEnrichment } from '../AIEnrichmentService.js';

describe('AIEnrichmentService (deprecated)', () => {
  test('returns default enrichment payload and logs warning', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await enrichLesson({
      topicName: 'Testing',
      lessonName: 'Unit Testing Basics'
    });

    expect(result).toEqual(defaultEnrichment);
    expect(warnSpy).toHaveBeenCalledWith(
      'enrichLesson is deprecated. Please migrate to /api/enrichment/assets for asset-based enrichment.'
    );

    warnSpy.mockRestore();
  });
});