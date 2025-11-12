import express from 'express';
import { enrichAssets } from '../services/enrichment/AssetEnrichmentService.js';

const router = express.Router();

router.post('/assets', async (req, res) => {
  const { topic, skills = [], maxItems = 6 } = req.body || {};

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'topic is required' });
  }

  try {
    const result = await enrichAssets({
      topic,
      skills: Array.isArray(skills) ? skills : [],
      maxItems: Number.isInteger(maxItems) && maxItems > 0 ? maxItems : 6
    });

    return res.json(result);
  } catch (error) {
    console.error('enrichmentAssetsRoutes error:', error);
    return res.status(500).json({ error: 'Failed to enrich assets' });
  }
});

export default router;

