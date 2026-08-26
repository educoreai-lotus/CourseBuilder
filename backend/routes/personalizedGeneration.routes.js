/**
 * Personalized generation readiness routes (additive, read-only).
 */

import express from 'express';
import { listPersonalizedGenerationJobs } from '../controllers/personalizedGeneration.controller.js';

const router = express.Router();

/**
 * GET /api/v1/personalized-generation/jobs
 */
router.get('/jobs', listPersonalizedGenerationJobs);

export default router;
