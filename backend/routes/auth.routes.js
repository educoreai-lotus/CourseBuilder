import express from 'express';
import { getAuthContext } from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * GET /api/v1/auth/context
 * Protected — relies on global authenticateRequest middleware.
 */
router.get('/context', getAuthContext);

export default router;
