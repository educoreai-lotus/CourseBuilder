import express from 'express';
import { enrichAssets } from '../services/enrichment/AssetEnrichmentService.js';

const router = express.Router();

router.post('/assets', async (req, res) => {
  const { topic, skills = [], maxItems = 6 } = req.body || {};

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ 
      error: 'topic is required',
      message: 'The request body must include a "topic" field (string)'
    });
  }

  try {
    console.log('[enrichmentAssetsRoutes] Request received:', { 
      topic, 
      skillsCount: Array.isArray(skills) ? skills.length : 0,
      maxItems 
    });

    const result = await enrichAssets({
      topic,
      skills: Array.isArray(skills) ? skills : [],
      maxItems: Number.isInteger(maxItems) && maxItems > 0 ? maxItems : 6
    });

    console.log('[enrichmentAssetsRoutes] Success:', {
      tagsCount: result?.tags?.length || 0,
      videosCount: result?.videos?.length || 0,
      reposCount: result?.repos?.length || 0
    });

    return res.json(result);
  } catch (error) {
    console.error('[enrichmentAssetsRoutes] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return res.status(500).json({ 
      error: 'Failed to enrich assets',
      message: error.message || 'An unexpected error occurred while enriching assets'
    });
  }
});

export default router;

