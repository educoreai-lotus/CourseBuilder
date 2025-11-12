const defaultEnrichment = {
  summary: 'Deprecated enrichment endpoint.',
  learning_objectives: [],
  examples: [],
  difficulty: 'unknown',
  estimated_duration_minutes: null,
  tags: [],
  recommendations: []
};

export async function enrichLesson() {
  console.warn(
    'enrichLesson is deprecated. Please migrate to /api/enrichment/assets for asset-based enrichment.'
  );
  return { ...defaultEnrichment };
}

export default {
  enrichLesson,
  defaultEnrichment
};

export { defaultEnrichment };
