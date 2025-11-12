import express from 'express';
import { enrichLesson } from '../services/AIEnrichmentService.js';

const router = express.Router();

router.post('/enrich', async (req, res) => {
  res.set('Warning', '299 - Deprecated: Use /api/enrichment/assets instead.');
  try {
    const result = await enrichLesson(req.body || {});
    res.json({
      ...result,
      deprecated: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message, deprecated: true });
  }
});

export default router;

