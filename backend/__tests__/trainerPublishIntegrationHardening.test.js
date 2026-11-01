import crypto from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import zlib from 'node:zlib';
import { generateSignature } from '../utils/signature.js';
import {
  TRAINER_PUBLISH_INIT_ACTION,
  TRAINER_PUBLISH_INIT_REQUESTER,
  TRAINER_PUBLISH_INIT_TARGET,
  signRoutingTicket
} from '../utils/trainerPublishInit.js';
import { TRAINER_PUBLISH_CHUNK_ACTION } from '../utils/trainerPublishChunk.js';
import { TRAINER_PUBLISH_FINALIZE_ACTION } from '../utils/trainerPublishFinalize.js';
import {
  TRAINER_PUBLISH_ERROR_CODES,
  buildTrainerPublishErrorResponse,
  trainerPublishError
} from '../utils/trainerPublishErrors.js';
import {
  createFillContentMetricsRateGate,
  coerceFillContentMetricsEnvelope,
  isChunkedTrainerPublishEnvelope,
  isCoordinatorEnvelopeAuthenticated,
  FILL_CONTENT_METRICS_STANDARD_MAX,
  TRAINER_PUBLISH_AUTHENTICATED_MAX
} from '../middleware/trainerPublishRateLimit.middleware.js';
import { API_RATE_LIMIT_MAX } from '../middleware/rateLimiter.middleware.js';
import { MAX_CHUNK_BASE64_CHARS } from '../services/trainerPublish/transferMemoryStore.js';
import { handleTrainerPublishInit } from '../services/trainerPublish/initService.js';
import { handleTrainerPublishChunk } from '../services/trainerPublish/chunkService.js';
import { handleTrainerPublishFinalize } from '../services/trainerPublish/finalizeService.js';
import {
  clearAllTransferSessions
} from '../services/trainerPublish/transferMemoryStore.js';
import { expandCompressedTrainerPublishIfNeeded } from '../utils/compressedTrainerPublish.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TRAINER_A = '11111111-1111-4111-8111-111111111111';

function generateEcKeyPair() {
  return crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

function mockReq(headers = {}) {
  return { headers };
}

describe('Phase 6D Trainer Publish integration hardening', () => {
  let coordinatorKeys;
  let courseBuilderKeys;

  beforeAll(() => {
    coordinatorKeys = generateEcKeyPair();
    courseBuilderKeys = generateEcKeyPair();
  });

  beforeEach(() => {
    clearAllTransferSessions();
  });

  function signCoord(envelope) {
    return generateSignature('coordinator', coordinatorKeys.privateKey, envelope);
  }

  describe('error_code mapping', () => {
    it('maps known Trainer Publish failures to stable codes', () => {
      const cases = [
        [410, TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SESSION_GONE],
        [401, TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID],
        [400, TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID],
        [400, TRAINER_PUBLISH_ERROR_CODES.TRANSFER_INCOMPLETE],
        [400, TRAINER_PUBLISH_ERROR_CODES.TRANSFER_HASH_MISMATCH],
        [413, TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SIZE_EXCEEDED],
        [409, TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_CONFLICT]
      ];
      for (const [status, code] of cases) {
        const { status: outStatus, body } = buildTrainerPublishErrorResponse(
          trainerPublishError(status, code, 'safe message')
        );
        expect(outStatus).toBe(status);
        expect(body.error_code).toBe(code);
        expect(body.message).toBe('safe message');
        expect(JSON.stringify(body)).not.toMatch(/BEGIN (EC )?PRIVATE|password|signature=|chunk_data/i);
      }
    });

    it('unexpected database errors return 500 without raw details', () => {
      const dbErr = new Error('duplicate key value violates unique constraint "courses_pkey" detail=...');
      const { status, body } = buildTrainerPublishErrorResponse(dbErr);
      expect(status).toBe(500);
      expect(body.error_code).toBe(
        TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_INTERNAL_ERROR
      );
      expect(body.message).toBe(
        'Trainer Publish request failed due to an internal error'
      );
      expect(body.message).not.toContain('courses_pkey');
      expect(body.message).not.toContain('duplicate key');
    });

    it('status-only errors without error_code become internal 500', () => {
      const err = new Error('something blew up');
      err.status = 400;
      const { status, body } = buildTrainerPublishErrorResponse(err);
      expect(status).toBe(500);
      expect(body.error_code).toBe(
        TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_INTERNAL_ERROR
      );
    });
  });

  describe('auth-gated rate limit', () => {
    function buildTestApp(gate) {
      const app = express();
      app.set('trust proxy', 1);
      app.use(express.json({ limit: '256kb' }));
      app.post('/api/fill-content-metrics', gate, (req, res) => {
        res.status(200).json({ ok: true, action: req.body?.payload?.action });
      });
      app.post('/api/other', (req, res) => {
        res.status(200).json({ ok: true });
      });
      return app;
    }

    function freshLimiters(standardMax, tpMax) {
      return {
        standardLimiter: rateLimit({
          windowMs: 60_000,
          max: standardMax,
          message: {
            error: 'Too many requests',
            message: 'Too many requests from this IP, please try again later.'
          },
          standardHeaders: true,
          legacyHeaders: false,
          validate: { trustProxy: false }
        }),
        trainerPublishLimiter: rateLimit({
          windowMs: 60_000,
          max: tpMax,
          message: {
            error: 'Too Many Requests',
            error_code: TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_RATE_LIMITED,
            message: 'Too many authenticated Trainer Publish requests'
          },
          standardHeaders: true,
          legacyHeaders: false,
          validate: { trustProxy: false }
        })
      };
    }

    it('exports TP authenticated max with headroom for 512 chunks', () => {
      expect(TRAINER_PUBLISH_AUTHENTICATED_MAX).toBeGreaterThanOrEqual(512 + 2);
      expect(TRAINER_PUBLISH_AUTHENTICATED_MAX).toBe(600);
      expect(FILL_CONTENT_METRICS_STANDARD_MAX).toBe(API_RATE_LIMIT_MAX);
      expect(FILL_CONTENT_METRICS_STANDARD_MAX).toBe(100);
    });

    it('authenticated Trainer Publish sequence is not blocked at standard 100', async () => {
      const { standardLimiter, trainerPublishLimiter } = freshLimiters(3, 20);
      const gate = createFillContentMetricsRateGate({
        loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
        standardLimiter,
        trainerPublishLimiter
      });
      const app = buildTestApp(gate);

      // More than standard max (3) but under TP max (20)
      for (let i = 0; i < 8; i++) {
        const envelope = {
          requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
          payload: {
            action: TRAINER_PUBLISH_CHUNK_ACTION,
            targetService: TRAINER_PUBLISH_INIT_TARGET,
            transfer_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            chunk_index: i,
            chunk_data: 'YQ=='
          },
          response: {}
        };
        const res = await request(app)
          .post('/api/fill-content-metrics')
          .set('X-Service-Name', 'coordinator')
          .set('X-Signature', signCoord(envelope))
          .send(envelope);
        expect(res.status).toBe(200);
      }
    });

    it('spoofed Trainer Publish actions cannot use privileged limit', async () => {
      const { standardLimiter, trainerPublishLimiter } = freshLimiters(3, 50);
      const gate = createFillContentMetricsRateGate({
        loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
        standardLimiter,
        trainerPublishLimiter
      });
      const app = buildTestApp(gate);

      for (let i = 0; i < 3; i++) {
        const envelope = {
          requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
          payload: {
            action: TRAINER_PUBLISH_CHUNK_ACTION,
            targetService: TRAINER_PUBLISH_INIT_TARGET
          },
          response: {}
        };
        // No valid Coord signature
        const res = await request(app)
          .post('/api/fill-content-metrics')
          .set('X-Service-Name', 'coordinator')
          .set('X-Signature', 'not-a-valid-signature')
          .send(envelope);
        expect(res.status).toBe(200);
      }

      const blocked = await request(app)
        .post('/api/fill-content-metrics')
        .set('X-Service-Name', 'coordinator')
        .set('X-Signature', 'not-a-valid-signature')
        .send({
          requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
          payload: {
            action: TRAINER_PUBLISH_CHUNK_ACTION,
            targetService: TRAINER_PUBLISH_INIT_TARGET
          },
          response: {}
        });
      expect(blocked.status).toBe(429);
      expect(blocked.body.error_code).toBeUndefined();
      expect(blocked.body.error).toBe('Too many requests');
    });

    it('invalid Coordinator signatures cannot access privileged limits', async () => {
      const { standardLimiter, trainerPublishLimiter } = freshLimiters(2, 50);
      const gate = createFillContentMetricsRateGate({
        loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
        standardLimiter,
        trainerPublishLimiter
      });
      const app = buildTestApp(gate);

      const envelope = {
        requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
        payload: {
          action: TRAINER_PUBLISH_INIT_ACTION,
          targetService: TRAINER_PUBLISH_INIT_TARGET
        },
        response: {}
      };

      await request(app)
        .post('/api/fill-content-metrics')
        .set('X-Service-Name', 'coordinator')
        .set('X-Signature', signCoord({ ...envelope, tampered: true }))
        .send(envelope)
        .expect(200);

      await request(app)
        .post('/api/fill-content-metrics')
        .set('X-Service-Name', 'coordinator')
        .set('X-Signature', 'deadbeef')
        .send(envelope)
        .expect(200);

      await request(app)
        .post('/api/fill-content-metrics')
        .set('X-Service-Name', 'coordinator')
        .set('X-Signature', 'deadbeef')
        .send(envelope)
        .expect(429);
    });

    it('Full AI Generation retains the original 100-class rate policy', async () => {
      const { standardLimiter, trainerPublishLimiter } = freshLimiters(3, 50);
      const gate = createFillContentMetricsRateGate({
        loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
        standardLimiter,
        trainerPublishLimiter
      });
      const app = buildTestApp(gate);

      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/fill-content-metrics')
          .send({
            requester_service: 'learner-ai',
            payload: { action: 'generate_course_content', prompt: 'x' },
            response: { course: {} }
          })
          .expect(200);
      }

      const blocked = await request(app)
        .post('/api/fill-content-metrics')
        .send({
          requester_service: 'learner-ai',
          payload: { action: 'generate_course_content' },
          response: { course: {} }
        });
      expect(blocked.status).toBe(429);
      expect(blocked.body.error).toBe('Too many requests');
      expect(blocked.body.error_code).toBeUndefined();
    });
  });

  describe('body size', () => {
    it('parses a maximum-valid CHUNK envelope under 256kb route limit', async () => {
      const app = express();
      app.use('/api/fill-content-metrics', express.json({ limit: '256kb' }));
      app.post('/api/fill-content-metrics', (req, res) => {
        expect(typeof req.body.payload.chunk_data).toBe('string');
        expect(req.body.payload.chunk_data.length).toBe(MAX_CHUNK_BASE64_CHARS);
        res.status(200).json({ ok: true, size: JSON.stringify(req.body).length });
      });

      const chunkData = 'A'.repeat(MAX_CHUNK_BASE64_CHARS);
      const envelope = {
        requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
        payload: {
          action: TRAINER_PUBLISH_CHUNK_ACTION,
          targetService: TRAINER_PUBLISH_INIT_TARGET,
          routing_ticket: {
            claims: {
              transfer_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
              iss: 'course-builder-service',
              aud: 'coordinator',
              requester: 'content-studio',
              dest: 'course-builder-service',
              ops: ['chunk', 'finalize'],
              exp: 9999999999,
              publisher_trainer_id: TRAINER_A,
              source_course_id: 'src',
              transfer_sha256: 'a'.repeat(64),
              expected_chunk_count: 1
            },
            signature: 'b'.repeat(128)
          },
          transfer_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          transfer_sha256: 'a'.repeat(64),
          expected_chunk_count: 1,
          publisher_trainer_id: TRAINER_A,
          source_course_id: 'src',
          chunk_index: 0,
          chunk_data: chunkData
        },
        response: {}
      };

      const serialized = JSON.stringify(envelope);
      // Max chunk (~72KB) + ticket/metadata fits under route 256kb with headroom.
      expect(serialized.length).toBeGreaterThan(70_000);
      expect(serialized.length).toBeLessThan(256 * 1024);

      const res = await request(app)
        .post('/api/fill-content-metrics')
        .set('Content-Type', 'application/json')
        .send(envelope);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('rejects oversized bodies on the fill-content-metrics parser', async () => {
      const app = express();
      app.use('/api/fill-content-metrics', express.json({ limit: '256kb' }));
      app.post('/api/fill-content-metrics', (_req, res) => res.json({ ok: true }));
      app.use((err, _req, res, _next) => {
        res.status(err.status || 500).json({ error: err.type || err.message });
      });

      const huge = {
        requester_service: 'content-studio',
        payload: { action: TRAINER_PUBLISH_CHUNK_ACTION, chunk_data: 'A'.repeat(300_000) },
        response: {}
      };
      const res = await request(app)
        .post('/api/fill-content-metrics')
        .set('Content-Type', 'application/json')
        .send(huge);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('default 100kb parser still applies to unrelated routes', async () => {
      const app = express();
      app.use('/api/fill-content-metrics', express.json({ limit: '256kb' }));
      app.use(express.json({ limit: '100kb' }));
      app.post('/api/other', (req, res) => res.json({ ok: true }));
      app.use((err, _req, res, _next) => {
        res.status(err.status || 500).json({ error: err.type || 'err' });
      });

      const res = await request(app)
        .post('/api/other')
        .set('Content-Type', 'application/json')
        .send({ data: 'A'.repeat(120_000) });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('INIT/CHUNK/FINALIZE still function with error_codes', () => {
    function initDeps() {
      return {
        loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
        loadCourseBuilderPrivateKey: () => courseBuilderKeys.privateKey,
        // Live clock so ticket/session exp stays ahead of CHUNK/FINALIZE Date.now() checks
        now: () => new Date()
      };
    }

    it('INIT returns initialized; missing session FINALIZE yields TRANSFER_SESSION_GONE', async () => {
      const gzip = zlib.gzipSync(Buffer.from(JSON.stringify({
        trainer_id: TRAINER_A,
        course_id: 'cs-1',
        course_name: 'C',
        topics: [{ topic_name: 'L', contents: [{ content_type: 'text_audio', html: 'x' }] }]
      })));
      const transferSha = crypto.createHash('sha256').update(gzip).digest('hex');
      const initEnvelope = {
        requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
        payload: {
          action: TRAINER_PUBLISH_INIT_ACTION,
          targetService: TRAINER_PUBLISH_INIT_TARGET,
          publisher_trainer_id: TRAINER_A,
          source_course_id: 'cs-1',
          transfer_sha256: transferSha,
          expected_chunk_count: 1
        },
        response: {}
      };
      const initRes = await handleTrainerPublishInit(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(initEnvelope)
        }),
        initEnvelope,
        initDeps()
      );
      expect(initRes.status).toBe('initialized');

      clearAllTransferSessions();

      const finalizeEnvelope = {
        requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
        payload: {
          action: TRAINER_PUBLISH_FINALIZE_ACTION,
          targetService: TRAINER_PUBLISH_INIT_TARGET,
          routing_ticket: initRes.routing_ticket,
          transfer_id: initRes.transfer_id,
          transfer_sha256: transferSha,
          expected_chunk_count: 1,
          publisher_trainer_id: TRAINER_A,
          source_course_id: 'cs-1'
        },
        response: {}
      };

      try {
        await handleTrainerPublishFinalize(
          mockReq({
            'x-service-name': 'coordinator',
            'x-signature': signCoord(finalizeEnvelope)
          }),
          finalizeEnvelope,
          {
            loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
            loadCourseBuilderPublicKey: () => courseBuilderKeys.publicKey
          }
        );
        throw new Error('expected failure');
      } catch (err) {
        expect(err.error_code).toBe(
          TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SESSION_GONE
        );
        expect(err.status).toBe(410);
        const { body } = buildTrainerPublishErrorResponse(err);
        expect(body.error_code).toBe(
          TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SESSION_GONE
        );
      }
    });

    it('expired ticket yields TRANSFER_TICKET_INVALID', async () => {
      const claims = {
        transfer_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        iss: 'course-builder-service',
        aud: 'coordinator',
        requester: 'content-studio',
        dest: 'course-builder-service',
        ops: ['chunk', 'finalize'],
        exp: Math.floor(Date.now() / 1000) - 10,
        publisher_trainer_id: TRAINER_A,
        source_course_id: 'cs',
        transfer_sha256: 'a'.repeat(64),
        expected_chunk_count: 1
      };
      const ticket = signRoutingTicket(claims, courseBuilderKeys.privateKey);
      const envelope = {
        requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
        payload: {
          action: TRAINER_PUBLISH_CHUNK_ACTION,
          targetService: TRAINER_PUBLISH_INIT_TARGET,
          routing_ticket: ticket,
          transfer_id: claims.transfer_id,
          transfer_sha256: claims.transfer_sha256,
          expected_chunk_count: 1,
          publisher_trainer_id: TRAINER_A,
          source_course_id: 'cs',
          chunk_index: 0,
          chunk_data: 'YQ=='
        },
        response: {}
      };
      await expect(
        handleTrainerPublishChunk(
          mockReq({
            'x-service-name': 'coordinator',
            'x-signature': signCoord(envelope)
          }),
          envelope,
          {
            loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
            loadCourseBuilderPublicKey: () => courseBuilderKeys.publicKey
          }
        )
      ).rejects.toMatchObject({
        status: 401,
        error_code: TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID
      });
    });
  });

  describe('regression / isolation', () => {
    it('compressed Trainer Publish expand still works', () => {
      const course = {
        trainer_id: TRAINER_A,
        course_id: 'c1',
        course_name: 'N',
        topics: [{ topic_name: 'T', contents: [] }]
      };
      const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(course))).toString(
        'base64'
      );
      const expanded = expandCompressedTrainerPublishIfNeeded('content-studio', {
        action: 'send this trainer course to publish',
        targetService: 'course-builder-service',
        course_encoding: 'gzip+base64',
        course_compressed: compressed
      });
      expect(expanded.course_name).toBe('N');
    });

    it('isChunkedTrainerPublishEnvelope rejects Full AI actions', () => {
      expect(
        isChunkedTrainerPublishEnvelope({
          requester_service: 'content-studio',
          payload: { action: 'generate_course_content', targetService: 'course-builder-service' }
        })
      ).toBe(false);
      expect(
        isChunkedTrainerPublishEnvelope({
          requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
          payload: {
            action: TRAINER_PUBLISH_FINALIZE_ACTION,
            targetService: TRAINER_PUBLISH_INIT_TARGET
          }
        })
      ).toBe(true);
    });

    it('Coord auth helper rejects missing signature', () => {
      const envelope = { requester_service: 'content-studio', payload: {}, response: {} };
      expect(
        isCoordinatorEnvelopeAuthenticated(
          mockReq({ 'x-service-name': 'coordinator' }),
          envelope,
          coordinatorKeys.publicKey
        )
      ).toBe(false);
      expect(
        isCoordinatorEnvelopeAuthenticated(
          mockReq({
            'x-service-name': 'coordinator',
            'x-signature': signCoord(envelope)
          }),
          envelope,
          coordinatorKeys.publicKey
        )
      ).toBe(true);
    });

    it('server mounts 256kb parser only for fill-content-metrics before default 100kb', () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const src = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
      const idx256 = src.indexOf("express.json({ limit: '256kb' })");
      const idx100 = src.indexOf("express.json({ limit: '100kb' })");
      expect(idx256).toBeGreaterThan(-1);
      expect(idx100).toBeGreaterThan(idx256);
      expect(src).toContain("app.use('/api/fill-content-metrics', express.json({ limit: '256kb' })");
    });

    it('apiLimiter skips fill-content-metrics by path only', () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const src = fs.readFileSync(
        path.join(__dirname, '../middleware/rateLimiter.middleware.js'),
        'utf8'
      );
      expect(src).toContain("path === '/fill-content-metrics'");
      expect(src).not.toMatch(/payload\.action.*skip|skip.*trainer_publish/);
      expect(src).toContain('API_RATE_LIMIT_MAX = 100');
    });

    it('coerceFillContentMetricsEnvelope accepts object and JSON string', () => {
      expect(coerceFillContentMetricsEnvelope({ a: 1 })).toEqual({ a: 1 });
      expect(coerceFillContentMetricsEnvelope('{"a":2}')).toEqual({ a: 2 });
      expect(coerceFillContentMetricsEnvelope('not-json')).toBeNull();
    });
  });
});
