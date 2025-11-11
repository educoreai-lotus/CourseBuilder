import express from 'express';
import { enrichLesson } from '../services/AIEnrichmentService.js';

const router = express.Router();

router.post('/enrich', async (req, res) => {
  try {
    const result = await enrichLesson(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

