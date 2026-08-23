/**
 * TEMPORARY Railway HTTP idle-timeout diagnostic.
 * Isolated from all Course Builder business flows.
 * Remove after the Railway experiment (endpoint + env vars).
 */

import crypto from 'crypto';

export const TOTAL_DURATION_MS = 6 * 60 * 1000;
export const PROCESSING_INTERVAL_MS = 45 * 1000;

const LOG_PREFIX = '[RailwayTimeoutDiagnostic]';

export function isRailwayTimeoutTestEnabled() {
  return process.env.RAILWAY_TIMEOUT_TEST_ENABLED === 'true';
}

export function isValidDiagnosticKey(headerValue) {
  const expected = process.env.RAILWAY_TIMEOUT_TEST_KEY;
  if (!expected || typeof expected !== 'string' || expected.length === 0) {
    return false;
  }
  if (typeof headerValue !== 'string' || headerValue.length === 0) {
    return false;
  }

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(headerValue, 'utf8');
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

function elapsedSeconds(startMs) {
  return Math.round((Date.now() - startMs) / 1000);
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve('aborted');
      return;
    }

    const timer = setTimeout(() => resolve('completed'), ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve('aborted');
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function connectionStillUsable(res) {
  return !res.writableEnded && !res.destroyed;
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{ totalDurationMs?: number, processingIntervalMs?: number }} [timing]
 */
export async function handleRailwayTimeoutTest(req, res, timing = {}) {
  if (!isRailwayTimeoutTestEnabled()) {
    return res.status(404).json({ error: 'Not Found' });
  }

  const diagnosticKey = req.get('X-Diagnostic-Key') || req.get('x-diagnostic-key');
  if (!isValidDiagnosticKey(diagnosticKey)) {
    return res.status(404).json({ error: 'Not Found' });
  }

  const mode = typeof req.query.mode === 'string' ? req.query.mode : '';
  if (mode !== 'silent' && mode !== '102' && mode !== '102-error') {
    return res.status(400).json({
      success: false,
      error: 'invalid mode',
      allowed: ['silent', '102', '102-error']
    });
  }

  const totalDurationMs = timing.totalDurationMs ?? TOTAL_DURATION_MS;
  const processingIntervalMs = timing.processingIntervalMs ?? PROCESSING_INTERVAL_MS;
  const startMs = Date.now();
  const startIso = new Date(startMs).toISOString();

  console.log(`${LOG_PREFIX} start`, {
    mode,
    start: startIso,
    totalDurationMs,
    processingIntervalMs
  });

  if ((mode === '102' || mode === '102-error') && typeof res.writeProcessing !== 'function') {
    console.log(`${LOG_PREFIX} writeProcessing unavailable`, { mode });
    return res.status(500).json({
      success: false,
      mode,
      completed: false,
      error: 'writeProcessing unavailable on ServerResponse'
    });
  }

  const abortController = new AbortController();
  let processingIntervalId = null;

  const clearProcessingInterval = () => {
    if (processingIntervalId !== null) {
      clearInterval(processingIntervalId);
      processingIntervalId = null;
    }
  };

  // Do NOT listen to req.on('close'): on Node 16+/20 that often means the
  // request message completed, not that the client/proxy disconnected.
  res.on('finish', () => {
    clearProcessingInterval();
  });

  res.on('close', () => {
    // Premature only when the final response has not completed.
    if (res.writableEnded) {
      clearProcessingInterval();
      return;
    }

    console.log(`${LOG_PREFIX} premature connection close`, {
      mode,
      elapsedSeconds: elapsedSeconds(startMs),
      at: new Date().toISOString()
    });
    clearProcessingInterval();
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  });

  if (mode === '102' || mode === '102-error') {
    processingIntervalId = setInterval(() => {
      if (abortController.signal.aborted || !connectionStillUsable(res)) {
        clearProcessingInterval();
        return;
      }

      try {
        res.writeProcessing(() => {});
        console.log(`${LOG_PREFIX} 102 Processing sent`, {
          mode,
          elapsedSeconds: elapsedSeconds(startMs),
          headersSent: res.headersSent
        });
      } catch (error) {
        console.log(`${LOG_PREFIX} 102 send failed`, {
          mode,
          elapsedSeconds: elapsedSeconds(startMs),
          message: error?.message || 'unknown'
        });
        clearProcessingInterval();
        abortController.abort();
      }
    }, processingIntervalMs);
  }

  const waitResult = await sleep(totalDurationMs, abortController.signal);
  clearProcessingInterval();

  if (waitResult === 'aborted' || !connectionStillUsable(res)) {
    console.log(`${LOG_PREFIX} aborted before final response`, {
      mode,
      elapsedSeconds: elapsedSeconds(startMs),
      waitResult
    });
    return;
  }

  const finalStatus = mode === '102-error' ? 502 : 200;
  const body =
    mode === '102-error'
      ? {
          success: false,
          mode: '102-error',
          completed: true,
          error: 'diagnostic-test-error'
        }
      : {
          success: true,
          mode,
          completed: true
        };

  console.log(`${LOG_PREFIX} final response`, {
    mode,
    elapsedSeconds: elapsedSeconds(startMs),
    at: new Date().toISOString(),
    finalHttpStatus: finalStatus,
    headersSentBeforeFinal: res.headersSent
  });

  return res.status(finalStatus).json(body);
}

export default {
  TOTAL_DURATION_MS,
  PROCESSING_INTERVAL_MS,
  isRailwayTimeoutTestEnabled,
  isValidDiagnosticKey,
  handleRailwayTimeoutTest
};
