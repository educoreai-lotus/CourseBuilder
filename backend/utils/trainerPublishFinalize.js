/**
 * Isolated Trainer Publish FINALIZE helpers (Phase 4).
 */

import crypto from 'node:crypto';
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
import {
  decodeCompressedTrainerCourseBuffer,
  MAX_DECOMPRESSED_TRAINER_COURSE_BYTES
} from './compressedTrainerPublish.js';
import {
  normalizeContentStudioPayload,
  validateNormalizedLesson
} from '../services/contentStudioNormalizer.js';
import {
  MAX_TRANSFER_DECODED_BYTES
} from '../services/trainerPublish/transferMemoryStore.js';
import {
  TRAINER_PUBLISH_ERROR_CODES,
  trainerPublishError
} from './trainerPublishErrors.js';

export const TRAINER_PUBLISH_FINALIZE_ACTION = 'trainer_publish_finalize';

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
export function isTrainerPublishFinalizeRequest(requesterService, payload) {
  return (
    requesterService === TRAINER_PUBLISH_INIT_REQUESTER &&
    payload != null &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    payload.action === TRAINER_PUBLISH_FINALIZE_ACTION &&
    payload.targetService === TRAINER_PUBLISH_INIT_TARGET
  );
}

/** Fail-closed Coordinator ECDSA over full envelope (same contract as INIT/CHUNK). */
export const assertCoordinatorSignedFinalizeEnvelope =
  assertCoordinatorSignedInitEnvelope;

/**
 * Verify CB-signed routing ticket and bind to FINALIZE payload metadata.
 * @param {Object} payload
 * @param {string|null} courseBuilderPublicKeyPem
 * @returns {Object} verified claims
 */
export function assertValidRoutingTicketForFinalize(
  payload,
  courseBuilderPublicKeyPem
) {
  const ticket = payload.routing_ticket;
  if (!ticket || typeof ticket !== 'object' || Array.isArray(ticket)) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Trainer Publish FINALIZE requires routing_ticket object'
    );
  }

  const claims = ticket.claims;
  const signature = ticket.signature;
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Trainer Publish FINALIZE routing_ticket.claims must be an object'
    );
  }
  if (typeof signature !== 'string' || !signature.trim()) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Trainer Publish FINALIZE routing_ticket.signature is required'
    );
  }

  if (!courseBuilderPublicKeyPem) {
    throw httpError(
      503,
      TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_INTERNAL_ERROR,
      'Trainer Publish FINALIZE ticket verification unavailable: Course Builder public key not configured'
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
      'Trainer Publish FINALIZE routing ticket signature verification failed'
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
  if (!ops.includes('finalize')) {
    throw httpError(
      403,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'Routing ticket does not permit finalize operation'
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
      'FINALIZE transfer_id does not match routing ticket'
    );
  }

  if (
    String(payload.transfer_sha256 || '').toLowerCase() !==
    String(claims.transfer_sha256 || '').toLowerCase()
  ) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'FINALIZE transfer_sha256 does not match routing ticket'
    );
  }

  if (Number(payload.expected_chunk_count) !== Number(claims.expected_chunk_count)) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'FINALIZE expected_chunk_count does not match routing ticket'
    );
  }

  if (
    String(payload.publisher_trainer_id || '').toLowerCase() !==
    String(claims.publisher_trainer_id || '').toLowerCase()
  ) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'FINALIZE publisher_trainer_id does not match routing ticket'
    );
  }

  if (String(payload.source_course_id || '') !== String(claims.source_course_id || '')) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'FINALIZE source_course_id does not match routing ticket'
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
      'FINALIZE organization_id does not match routing ticket'
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
 * Map decoder failures (legacy status-only errors) to stable TP codes.
 * @param {unknown} err
 */
function rethrowDecodeError(err) {
  if (err && err.isTrainerPublishError) {
    throw err;
  }
  const msg = String(err?.message || 'Failed to decode reassembled trainer course');
  if (/maximum decompressed size|exceeds maximum size/i.test(msg)) {
    throw httpError(
      err?.status === 413 ? 413 : 400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SIZE_EXCEEDED,
      msg
    );
  }
  if (/GZIP|JSON|empty/i.test(msg)) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      msg
    );
  }
  throw httpError(
    400,
    TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
    'Failed to decode reassembled trainer course'
  );
}

/**
 * Verify reassembled GZIP bytes against transfer_sha256, then decompress+parse.
 * @param {Buffer} gzipBytes
 * @param {string} transferSha256
 * @returns {Object} trainer course object
 */
export function verifyAndDecodeReassembledCourse(gzipBytes, transferSha256) {
  if (!Buffer.isBuffer(gzipBytes) || gzipBytes.length === 0) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'Reassembled Trainer Publish transfer is empty'
    );
  }

  if (gzipBytes.length > MAX_TRANSFER_DECODED_BYTES) {
    throw httpError(
      413,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SIZE_EXCEEDED,
      `Reassembled Trainer Publish transfer exceeds maximum size of ${MAX_TRANSFER_DECODED_BYTES} bytes`
    );
  }

  const actualSha = crypto
    .createHash('sha256')
    .update(gzipBytes)
    .digest('hex');
  if (actualSha !== String(transferSha256 || '').toLowerCase()) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_HASH_MISMATCH,
      'Reassembled transfer SHA-256 does not match transfer_sha256'
    );
  }

  try {
    return decodeCompressedTrainerCourseBuffer(gzipBytes);
  } catch (err) {
    rethrowDecodeError(err);
  }
}

/**
 * Bind reconstructed course identity to ticket claims and normalize for persistence.
 * @param {Object} course - decoded CS trainer course
 * @param {Object} claims - verified ticket claims
 * @returns {{
 *   normalized: Object,
 *   created_by_user_id: string,
 *   source_course_id: string
 * }}
 */
export function normalizeAndBindTrainerCourse(course, claims) {
  const publisherId = String(claims.publisher_trainer_id).toLowerCase();
  const sourceCourseId = String(claims.source_course_id);

  if (String(course.course_id || '') !== sourceCourseId) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'Reassembled course_id does not match ticket source_course_id'
    );
  }

  if (
    !isUuid(course.trainer_id) ||
    String(course.trainer_id).toLowerCase() !== publisherId
  ) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'Reassembled trainer_id does not match ticket publisher_trainer_id'
    );
  }

  const boundCourse = {
    ...course,
    trainer_id: publisherId,
    course_id: sourceCourseId
  };

  const normalized = normalizeContentStudioPayload(boundCourse);

  if (!Array.isArray(normalized.lessons) || normalized.lessons.length === 0) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'Normalized trainer course has no lessons to publish'
    );
  }

  for (let i = 0; i < normalized.lessons.length; i++) {
    if (!validateNormalizedLesson(normalized.lessons[i])) {
      throw httpError(
        400,
        TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
        `Normalized lesson at index ${i} is missing required fields`
      );
    }
  }

  return {
    normalized,
    created_by_user_id: publisherId,
    source_course_id: sourceCourseId
  };
}

export {
  MAX_DECOMPRESSED_TRAINER_COURSE_BYTES
};

export default {
  isTrainerPublishFinalizeRequest,
  assertCoordinatorSignedFinalizeEnvelope,
  assertValidRoutingTicketForFinalize,
  verifyAndDecodeReassembledCourse,
  normalizeAndBindTrainerCourse,
  TRAINER_PUBLISH_FINALIZE_ACTION
};
