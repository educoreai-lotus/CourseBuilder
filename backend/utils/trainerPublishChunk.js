/**
 * Isolated Trainer Publish CHUNK helpers (Phase 3).
 */

import { verifySignature } from './signature.js';
import {
  TRAINER_PUBLISH_INIT_REQUESTER,
  TRAINER_PUBLISH_INIT_TARGET,
  TRAINER_PUBLISH_TICKET_AUD,
  TRAINER_PUBLISH_TICKET_DEST,
  TRAINER_PUBLISH_TICKET_ISS,
  TRAINER_PUBLISH_TICKET_REQUESTER,
  assertCoordinatorSignedInitEnvelope
} from './trainerPublishInit.js';
import { MAX_CHUNK_BASE64_CHARS } from '../services/trainerPublish/transferMemoryStore.js';
import {
  TRAINER_PUBLISH_ERROR_CODES,
  trainerPublishError
} from './trainerPublishErrors.js';

export const TRAINER_PUBLISH_CHUNK_ACTION = 'trainer_publish_chunk';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(status, errorCode, message) {
  return trainerPublishError(status, errorCode, message);
}

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/**
 * @param {string} requesterService
 * @param {Object} payload
 * @returns {boolean}
 */
export function isTrainerPublishChunkRequest(requesterService, payload) {
  return (
    requesterService === TRAINER_PUBLISH_INIT_REQUESTER &&
    payload != null &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    payload.action === TRAINER_PUBLISH_CHUNK_ACTION &&
    payload.targetService === TRAINER_PUBLISH_INIT_TARGET
  );
}

/** Re-export Coord envelope verify for CHUNK (same fail-closed contract as INIT). */
export const assertCoordinatorSignedChunkEnvelope =
  assertCoordinatorSignedInitEnvelope;

/**
 * Verify CB-signed routing ticket and bind to CHUNK payload metadata.
 * @param {Object} payload
 * @param {string|null} courseBuilderPublicKeyPem
 * @returns {Object} verified claims
 */
export function assertValidRoutingTicketForChunk(payload, courseBuilderPublicKeyPem) {
  const ticket = payload.routing_ticket;
  if (!ticket || typeof ticket !== 'object' || Array.isArray(ticket)) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Trainer Publish CHUNK requires routing_ticket object'
    );
  }

  const claims = ticket.claims;
  const signature = ticket.signature;
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Trainer Publish CHUNK routing_ticket.claims must be an object'
    );
  }
  if (typeof signature !== 'string' || !signature.trim()) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Trainer Publish CHUNK routing_ticket.signature is required'
    );
  }

  if (!courseBuilderPublicKeyPem) {
    throw httpError(
      503,
      TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_INTERNAL_ERROR,
      'Trainer Publish CHUNK ticket verification unavailable: Course Builder public key not configured'
    );
  }

  const ok = verifySignature(
    TRAINER_PUBLISH_TICKET_ISS,
    signature,
    courseBuilderPublicKeyPem,
    claims
  );
  if (!ok) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Trainer Publish CHUNK routing ticket signature verification failed'
    );
  }

  if (claims.iss !== TRAINER_PUBLISH_TICKET_ISS) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Invalid routing ticket issuer'
    );
  }
  if (claims.aud !== TRAINER_PUBLISH_TICKET_AUD) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Invalid routing ticket audience'
    );
  }
  if (claims.requester !== TRAINER_PUBLISH_TICKET_REQUESTER) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Invalid routing ticket requester'
    );
  }
  if (claims.dest !== TRAINER_PUBLISH_TICKET_DEST) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Invalid routing ticket destination'
    );
  }

  const ops = Array.isArray(claims.ops) ? claims.ops : [];
  if (!ops.includes('chunk')) {
    throw httpError(
      403,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Routing ticket does not permit chunk operation'
    );
  }

  const exp = Number(claims.exp);
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Routing ticket has expired'
    );
  }

  const transferId = String(payload.transfer_id || '').trim();
  if (!transferId || transferId !== String(claims.transfer_id)) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'CHUNK transfer_id does not match routing ticket'
    );
  }

  if (
    String(payload.transfer_sha256 || '').toLowerCase() !==
    String(claims.transfer_sha256 || '').toLowerCase()
  ) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'CHUNK transfer_sha256 does not match routing ticket'
    );
  }

  if (Number(payload.expected_chunk_count) !== Number(claims.expected_chunk_count)) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'CHUNK expected_chunk_count does not match routing ticket'
    );
  }

  if (
    String(payload.publisher_trainer_id || '').toLowerCase() !==
    String(claims.publisher_trainer_id || '').toLowerCase()
  ) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'CHUNK publisher_trainer_id does not match routing ticket'
    );
  }

  if (String(payload.source_course_id || '') !== String(claims.source_course_id || '')) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'CHUNK source_course_id does not match routing ticket'
    );
  }

  const payloadOrg =
    payload.organization_id === undefined || payload.organization_id === null
      ? null
      : String(payload.organization_id).toLowerCase();
  const claimsOrg =
    claims.organization_id === undefined || claims.organization_id === null
      ? null
      : String(claims.organization_id).toLowerCase();
  if (payloadOrg !== claimsOrg) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'CHUNK organization_id does not match routing ticket'
    );
  }

  if (!isUuid(claims.publisher_trainer_id)) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Routing ticket publisher_trainer_id is invalid'
    );
  }

  return claims;
}

/**
 * Validate CHUNK body fields and decode Base64 chunk bytes.
 * @param {Object} payload
 * @returns {{ chunk_index: number, decoded: Buffer }}
 */
export function assertValidChunkPayload(payload) {
  const rawIndex = payload.chunk_index;
  const chunkIndex = Number(rawIndex);
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'CHUNK requires non-negative integer chunk_index'
    );
  }

  const chunkData = payload.chunk_data;
  if (typeof chunkData !== 'string' || chunkData.length === 0) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'CHUNK requires non-empty Base64 chunk_data string'
    );
  }

  if (chunkData.length > MAX_CHUNK_BASE64_CHARS) {
    throw httpError(
      413,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SIZE_EXCEEDED,
      `chunk_data exceeds maximum length of ${MAX_CHUNK_BASE64_CHARS} Base64 characters`
    );
  }

  const compact = chunkData.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 !== 0) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'chunk_data is not valid Base64'
    );
  }

  let decoded;
  try {
    decoded = Buffer.from(compact, 'base64');
  } catch {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'chunk_data Base64 decoding failed'
    );
  }

  if (!decoded || decoded.length === 0) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'chunk_data decoded to empty bytes'
    );
  }

  return { chunk_index: chunkIndex, decoded };
}

export default {
  isTrainerPublishChunkRequest,
  assertCoordinatorSignedChunkEnvelope,
  assertValidRoutingTicketForChunk,
  assertValidChunkPayload,
  TRAINER_PUBLISH_CHUNK_ACTION
};
