/**
 * TEMPORARY diagnostics routes — Railway idle-timeout experiment only.
 * Mounted outside /api and before authentication.
 */

import express from 'express';
import { handleRailwayTimeoutTest } from '../diagnostics/railwayTimeoutDiagnostic.js';

const router = express.Router();

router.get('/railway-timeout-test', (req, res) => handleRailwayTimeoutTest(req, res));

export default router;
