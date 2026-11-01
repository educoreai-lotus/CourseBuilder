/**
 * Auth-gated rate limiting for POST /api/fill-content-metrics only.
 *
 * Design (middleware order: global apiLimiter skips this path → this gate runs):
 * - Non–Trainer Publish traffic (Full AI, legacy publish, etc.): same 100 / 15 min / IP.
 * - Spoofed Trainer Publish action names OR invalid/missing Coordinator ECDSA:
 *   counted against the standard 100 / 15 min limit (no privileged bypass).
 * - Cryptographically verified Coordinator-signed INIT/CHUNK/FINALIZE:
 *   counted against Trainer Publish limit (600 / 15 min / IP) — enough for
 *   512 chunks + INIT + FINALIZE + retry headroom, without raising global /api max.
 *
 * Never skips limits solely because the JSON body names a Trainer Publish action.
 */

import rateLimit from 'express-rate-limit';
import { verifySignature } from '../utils/signature.js';
import { loadCoordinatorPublicKey } from '../utils/serviceKeys.js';
import { isTrainerPublishInitRequest } from '../utils/trainerPublishInit.js';
import { isTrainerPublishChunkRequest } from '../utils/trainerPublishChunk.js';
import { isTrainerPublishFinalizeRequest } from '../utils/trainerPublishFinalize.js';
import { TRAINER_PUBLISH_ERROR_CODES } from '../utils/trainerPublishErrors.js';

/** Standard policy — identical to apiLimiter (Full AI + unrelated fill-content-metrics). */
export const FILL_CONTENT_METRICS_STANDARD_MAX = 100;
export const FILL_CONTENT_METRICS_WINDOW_MS = 15 * 60 * 1000;

/**
 * Authenticated Trainer Publish only.
 * 512 max chunks + INIT + FINALIZE + ~85 operational retries/parallel headroom.
 */
export const TRAINER_PUBLISH_AUTHENTICATED_MAX = 600;

/** Same shape as global apiLimiter — no TP error_code (Full AI / legacy unchanged). */
const standardMessage = {
  error: 'Too many requests',
  message: 'Too many requests from this IP, please try again later.'
};

/** Authenticated Trainer Publish only — includes stable error_code for CS/Coord 502 parse. */
const trainerPublishMessage = {
  error: 'Too Many Requests',
  error_code: TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_RATE_LIMITED,
  message:
    'Too many authenticated Trainer Publish requests from this IP, please try again later.'
};

export const fillContentMetricsStandardLimiter = rateLimit({
  windowMs: FILL_CONTENT_METRICS_WINDOW_MS,
  max: FILL_CONTENT_METRICS_STANDARD_MAX,
  message: standardMessage,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

export const trainerPublishAuthenticatedLimiter = rateLimit({
  windowMs: FILL_CONTENT_METRICS_WINDOW_MS,
  max: TRAINER_PUBLISH_AUTHENTICATED_MAX,
  message: trainerPublishMessage,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

/**
 * @param {unknown} body
 * @returns {Object|null}
 */
export function coerceFillContentMetricsEnvelope(body) {
  if (body == null) return null;
  if (typeof body === 'object' && !Array.isArray(body)) {
    return body;
  }
  if (typeof body === 'string' && body.trim()) {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Soft Coordinator ECDSA check for rate-gate only (does not throw).
 * @param {import('express').Request} req
 * @param {Object} envelope
 * @param {string|null} coordinatorPublicKeyPem
 * @returns {boolean}
 */
export function isCoordinatorEnvelopeAuthenticated(
  req,
  envelope,
  coordinatorPublicKeyPem
) {
  if (!envelope || !coordinatorPublicKeyPem) {
    return false;
  }

  const serviceName = String(
    req?.headers?.['x-service-name'] || req?.headers?.['X-Service-Name'] || ''
  ).trim();
  const signature = String(
    req?.headers?.['x-signature'] || req?.headers?.['X-Signature'] || ''
  ).trim();

  if (serviceName !== 'coordinator' || !signature) {
    return false;
  }

  try {
    return Boolean(
      verifySignature('coordinator', signature, coordinatorPublicKeyPem, envelope)
    );
  } catch {
    return false;
  }
}

/**
 * True when envelope claims Chunked Trainer Publish INIT/CHUNK/FINALIZE identity.
 * @param {Object|null} envelope
 * @returns {boolean}
 */
export function isChunkedTrainerPublishEnvelope(envelope) {
  if (!envelope) return false;
  const requester = envelope.requester_service;
  const payload = envelope.payload;
  return (
    isTrainerPublishInitRequest(requester, payload) ||
    isTrainerPublishChunkRequest(requester, payload) ||
    isTrainerPublishFinalizeRequest(requester, payload)
  );
}

/**
 * @param {Object} [deps] - test overrides
 * @returns {import('express').RequestHandler}
 */
export function createFillContentMetricsRateGate(deps = {}) {
  const loadCoordKey = deps.loadCoordinatorPublicKey || loadCoordinatorPublicKey;
  const standardLimiter =
    deps.standardLimiter || fillContentMetricsStandardLimiter;
  const tpLimiter = deps.trainerPublishLimiter || trainerPublishAuthenticatedLimiter;
  const authenticate =
    deps.isCoordinatorEnvelopeAuthenticated || isCoordinatorEnvelopeAuthenticated;

  return function fillContentMetricsRateGate(req, res, next) {
    const envelope = coerceFillContentMetricsEnvelope(req.body);

    if (!isChunkedTrainerPublishEnvelope(envelope)) {
      // Full AI / legacy / unrelated → original 100 / 15 min policy.
      return standardLimiter(req, res, next);
    }

    const coordKey = loadCoordKey();
    const authenticated = authenticate(req, envelope, coordKey);

    if (!authenticated) {
      // Spoofed action or bad/missing Coord signature → normal protections only.
      return standardLimiter(req, res, next);
    }

    // Verified Coordinator → Trainer Publish–specific bounded limit.
    return tpLimiter(req, res, next);
  };
}

/** Default gate used by production routes. */
export const fillContentMetricsRateGate = createFillContentMetricsRateGate();

export default {
  createFillContentMetricsRateGate,
  fillContentMetricsRateGate,
  fillContentMetricsStandardLimiter,
  trainerPublishAuthenticatedLimiter,
  coerceFillContentMetricsEnvelope,
  isCoordinatorEnvelopeAuthenticated,
  isChunkedTrainerPublishEnvelope,
  FILL_CONTENT_METRICS_STANDARD_MAX,
  TRAINER_PUBLISH_AUTHENTICATED_MAX,
  FILL_CONTENT_METRICS_WINDOW_MS
};
