import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'node:events';
import express from 'express';
import http from 'node:http';
import {
  handleRailwayTimeoutTest,
  isRailwayTimeoutTestEnabled,
  isValidDiagnosticKey,
  TOTAL_DURATION_MS,
  PROCESSING_INTERVAL_MS
} from '../diagnostics/railwayTimeoutDiagnostic.js';

function createMockReqRes({ mode = 'silent', key = 'test-diagnostic-key' } = {}) {
  const req = new EventEmitter();
  req.query = { mode };
  req.get = (name) => {
    if (String(name).toLowerCase() === 'x-diagnostic-key') {
      return key;
    }
    return undefined;
  };

  const res = new EventEmitter();
  res.headersSent = false;
  res.writableEnded = false;
  res.destroyed = false;
  res.writeProcessing = jest.fn((cb) => {
    if (typeof cb === 'function') cb();
  });
  res.statusCode = null;
  res.body = null;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    res.writableEnded = true;
    res.emit('finish');
    res.emit('close');
    return res;
  });

  return { req, res };
}

function request(app, { mode, key, method = 'GET' } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const path = mode
        ? `/diagnostics/railway-timeout-test?mode=${encodeURIComponent(mode)}`
        : '/diagnostics/railway-timeout-test';
      const headers = {};
      if (key !== undefined) {
        headers['X-Diagnostic-Key'] = key;
      }

      const req = http.request(
        { hostname: '127.0.0.1', port, path, method, headers },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            server.close();
            let json = null;
            try {
              json = body ? JSON.parse(body) : null;
            } catch {
              json = body;
            }
            resolve({ status: res.statusCode, body: json, raw: body });
          });
        }
      );
      req.on('error', (error) => {
        server.close();
        reject(error);
      });
      req.end();
    });
  });
}

describe('railwayTimeoutDiagnostic', () => {
  const originalEnabled = process.env.RAILWAY_TIMEOUT_TEST_ENABLED;
  const originalKey = process.env.RAILWAY_TIMEOUT_TEST_KEY;

  beforeEach(() => {
    process.env.RAILWAY_TIMEOUT_TEST_ENABLED = 'true';
    process.env.RAILWAY_TIMEOUT_TEST_KEY = 'test-diagnostic-key';
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalEnabled === undefined) {
      delete process.env.RAILWAY_TIMEOUT_TEST_ENABLED;
    } else {
      process.env.RAILWAY_TIMEOUT_TEST_ENABLED = originalEnabled;
    }
    if (originalKey === undefined) {
      delete process.env.RAILWAY_TIMEOUT_TEST_KEY;
    } else {
      process.env.RAILWAY_TIMEOUT_TEST_KEY = originalKey;
    }
  });

  it('exposes fixed diagnostic timing constants', () => {
    expect(TOTAL_DURATION_MS).toBe(6 * 60 * 1000);
    expect(PROCESSING_INTERVAL_MS).toBe(45 * 1000);
  });

  it('treats feature flag as disabled unless exactly true', () => {
    process.env.RAILWAY_TIMEOUT_TEST_ENABLED = 'TRUE';
    expect(isRailwayTimeoutTestEnabled()).toBe(false);
    process.env.RAILWAY_TIMEOUT_TEST_ENABLED = 'true';
    expect(isRailwayTimeoutTestEnabled()).toBe(true);
  });

  it('validates diagnostic key without exposing it', () => {
    expect(isValidDiagnosticKey('test-diagnostic-key')).toBe(true);
    expect(isValidDiagnosticKey('wrong')).toBe(false);
    expect(isValidDiagnosticKey('')).toBe(false);
    expect(isValidDiagnosticKey(undefined)).toBe(false);
  });

  it('returns 404 when feature flag is disabled', async () => {
    process.env.RAILWAY_TIMEOUT_TEST_ENABLED = 'false';
    const app = express();
    app.get('/diagnostics/railway-timeout-test', (req, res) =>
      handleRailwayTimeoutTest(req, res, { totalDurationMs: 50, processingIntervalMs: 20 })
    );
    const result = await request(app, {
      mode: 'silent',
      key: 'test-diagnostic-key'
    });
    expect(result.status).toBe(404);
  });

  it('returns 404 when diagnostic key is missing or wrong', async () => {
    const app = express();
    app.get('/diagnostics/railway-timeout-test', (req, res) =>
      handleRailwayTimeoutTest(req, res, { totalDurationMs: 50, processingIntervalMs: 20 })
    );

    const missing = await request(app, { mode: 'silent' });
    expect(missing.status).toBe(404);

    const wrong = await request(app, {
      mode: 'silent',
      key: 'wrong-key'
    });
    expect(wrong.status).toBe(404);
  });

  it('returns 404 when enabled but server diagnostic key is missing', async () => {
    delete process.env.RAILWAY_TIMEOUT_TEST_KEY;
    expect(isValidDiagnosticKey('anything')).toBe(false);

    const app = express();
    app.get('/diagnostics/railway-timeout-test', (req, res) =>
      handleRailwayTimeoutTest(req, res, { totalDurationMs: 50, processingIntervalMs: 20 })
    );
    const result = await request(app, {
      mode: 'silent',
      key: 'anything'
    });
    expect(result.status).toBe(404);
  });

  it('returns 404 when enabled but server diagnostic key is empty', async () => {
    process.env.RAILWAY_TIMEOUT_TEST_KEY = '';
    expect(isValidDiagnosticKey('')).toBe(false);
    expect(isValidDiagnosticKey('test-diagnostic-key')).toBe(false);

    const app = express();
    app.get('/diagnostics/railway-timeout-test', (req, res) =>
      handleRailwayTimeoutTest(req, res, { totalDurationMs: 50, processingIntervalMs: 20 })
    );
    const emptyHeader = await request(app, { mode: 'silent', key: '' });
    expect(emptyHeader.status).toBe(404);

    const withCallerKey = await request(app, {
      mode: 'silent',
      key: 'test-diagnostic-key'
    });
    expect(withCallerKey.status).toBe(404);
  });

  it('returns 400 for invalid mode', async () => {
    const app = express();
    app.get('/diagnostics/railway-timeout-test', (req, res) =>
      handleRailwayTimeoutTest(req, res, { totalDurationMs: 50, processingIntervalMs: 20 })
    );
    const result = await request(app, {
      mode: 'nope',
      key: 'test-diagnostic-key'
    });
    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
    expect(result.body.error).toBe('invalid mode');
  });

  it('incoming request close does not cancel the diagnostic', async () => {
    jest.useFakeTimers();
    const { req, res } = createMockReqRes({ mode: 'silent' });

    const pending = handleRailwayTimeoutTest(req, res, {
      totalDurationMs: 1000,
      processingIntervalMs: 200
    });

    // Simulate Node IncomingMessage "close" after request message completion.
    req.emit('close');

    await jest.advanceTimersByTimeAsync(1000);
    await pending;

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      success: true,
      mode: 'silent',
      completed: true
    });
  });

  it('premature response connection close cleans up timers and skips final body', async () => {
    jest.useFakeTimers();
    const { req, res } = createMockReqRes({ mode: '102' });

    const pending = handleRailwayTimeoutTest(req, res, {
      totalDurationMs: 5000,
      processingIntervalMs: 1000
    });

    await jest.advanceTimersByTimeAsync(1000);
    expect(res.writeProcessing).toHaveBeenCalled();

    // Premature proxy/client disconnect before final response.
    res.writableEnded = false;
    res.emit('close');

    await jest.advanceTimersByTimeAsync(5000);
    await pending;

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('silent mode returns final 200 after wait', async () => {
    jest.useFakeTimers();
    const { req, res } = createMockReqRes({ mode: 'silent' });

    const pending = handleRailwayTimeoutTest(req, res, {
      totalDurationMs: 1000,
      processingIntervalMs: 200
    });

    await jest.advanceTimersByTimeAsync(1000);
    await pending;

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      success: true,
      mode: 'silent',
      completed: true
    });
    expect(res.writeProcessing).not.toHaveBeenCalled();
  });

  it('102 mode uses writeProcessing, keeps headers uncommitted, finishes 200', async () => {
    jest.useFakeTimers();
    const { req, res } = createMockReqRes({ mode: '102' });
    res.writeProcessing = jest.fn((cb) => {
      expect(res.headersSent).toBe(false);
      if (typeof cb === 'function') cb();
    });

    const pending = handleRailwayTimeoutTest(req, res, {
      totalDurationMs: 1000,
      processingIntervalMs: 200
    });

    await jest.advanceTimersByTimeAsync(1000);
    await pending;

    expect(res.writeProcessing.mock.calls.length).toBeGreaterThan(0);
    expect(res.headersSent).toBe(false);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      success: true,
      mode: '102',
      completed: true
    });
  });

  it('102-error mode finishes with 502 after informational processing', async () => {
    jest.useFakeTimers();
    const { req, res } = createMockReqRes({ mode: '102-error' });

    const pending = handleRailwayTimeoutTest(req, res, {
      totalDurationMs: 1000,
      processingIntervalMs: 200
    });

    await jest.advanceTimersByTimeAsync(1000);
    await pending;

    expect(res.writeProcessing.mock.calls.length).toBeGreaterThan(0);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.body).toEqual({
      success: false,
      mode: '102-error',
      completed: true,
      error: 'diagnostic-test-error'
    });
  });

  it('fails 102 modes immediately when writeProcessing is unavailable', async () => {
    const { req, res } = createMockReqRes({ mode: '102' });
    res.writeProcessing = undefined;

    await handleRailwayTimeoutTest(req, res, {
      totalDurationMs: 1000,
      processingIntervalMs: 200
    });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.error).toMatch(/writeProcessing unavailable/i);
  });
});
