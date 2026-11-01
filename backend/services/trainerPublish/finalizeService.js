/**
 * Trainer Publish FINALIZE orchestration (Phase 4).
 * Auth → reassemble → integrity → normalize → transactional idempotent publish.
 */

import {
  loadCoordinatorPublicKey,
  loadCourseBuilderPublicKey
} from '../../utils/serviceKeys.js';
import {
  assertCoordinatorSignedFinalizeEnvelope,
  assertValidRoutingTicketForFinalize,
  normalizeAndBindTrainerCourse,
  verifyAndDecodeReassembledCourse
} from '../../utils/trainerPublishFinalize.js';
import {
  getTransferSession,
  reassembleTransferBytes,
  removeTransferSession
} from './transferMemoryStore.js';
import {
  buildPersistableCourseSnapshot,
  computeContentFingerprint,
  generateDeterministicCourseId
} from './contentFingerprint.js';
import { publishTrainerCourseIdempotent } from './finalizePersist.js';
import {
  TRAINER_PUBLISH_ERROR_CODES,
  trainerPublishError
} from '../../utils/trainerPublishErrors.js';

function httpError(status, errorCode, message) {
  return trainerPublishError(status, errorCode, message);
}

/**
 * Bind FINALIZE payload + ticket claims to the in-memory session metadata.
 * @param {Object} claims
 * @param {Object} session
 */
function assertSessionMatchesClaims(claims, session) {
  if (!session) {
    throw httpError(
      410,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SESSION_GONE,
      'Trainer Publish transfer buffer not found or expired; restart from INIT'
    );
  }

  if (
    String(session.publisher_trainer_id).toLowerCase() !==
    String(claims.publisher_trainer_id).toLowerCase()
  ) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'FINALIZE session publisher_trainer_id mismatch'
    );
  }
  if (String(session.source_course_id) !== String(claims.source_course_id)) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'FINALIZE session source_course_id mismatch'
    );
  }
  if (
    String(session.transfer_sha256).toLowerCase() !==
    String(claims.transfer_sha256).toLowerCase()
  ) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'FINALIZE session transfer_sha256 mismatch'
    );
  }
  if (Number(session.expected_chunk_count) !== Number(claims.expected_chunk_count)) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'FINALIZE session expected_chunk_count mismatch'
    );
  }

  const sessionOrg = session.organization_id || null;
  const claimsOrg = claims.organization_id || null;
  if (
    (sessionOrg ? String(sessionOrg).toLowerCase() : null) !==
    (claimsOrg ? String(claimsOrg).toLowerCase() : null)
  ) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_TICKET_INVALID,
      'FINALIZE session organization_id mismatch'
    );
  }
}

/**
 * @param {import('express').Request} req
 * @param {Object} envelope
 * @param {Object} [deps]
 * @returns {Promise<{
 *   status: string,
 *   transfer_id: string,
 *   course_id: string,
 *   source_course_id: string,
 *   lessons_created: number,
 *   lessons_expected: number,
 *   content_fingerprint: string
 * }>}
 */
export async function handleTrainerPublishFinalize(req, envelope, deps = {}) {
  const loadCoordKey = deps.loadCoordinatorPublicKey || loadCoordinatorPublicKey;
  const loadCbPublic = deps.loadCourseBuilderPublicKey || loadCourseBuilderPublicKey;
  const getSession = deps.getTransferSession || getTransferSession;
  const reassemble = deps.reassembleTransferBytes || reassembleTransferBytes;
  const removeSession = deps.removeTransferSession || removeTransferSession;
  const publish = deps.publishTrainerCourseIdempotent || publishTrainerCourseIdempotent;

  // 1) Auth before reading transfer data.
  assertCoordinatorSignedFinalizeEnvelope(req, envelope, loadCoordKey());
  const claims = assertValidRoutingTicketForFinalize(
    envelope.payload,
    loadCbPublic()
  );

  const transferId = String(claims.transfer_id);
  const session = getSession(transferId);
  assertSessionMatchesClaims(claims, session);

  // 2) Reassemble + transport integrity.
  const gzipBytes = reassemble(transferId);
  const course = verifyAndDecodeReassembledCourse(
    gzipBytes,
    claims.transfer_sha256
  );

  // 3) Normalize + publisher / source binding (no DB yet).
  const { normalized, created_by_user_id, source_course_id } =
    normalizeAndBindTrainerCourse(course, claims);

  const incomingSnapshot = buildPersistableCourseSnapshot({
    course_name: normalized.course_name,
    course_description: normalized.course_description,
    created_by_user_id,
    lessons: normalized.lessons
  });
  const contentFingerprint = computeContentFingerprint(incomingSnapshot);
  const courseId = generateDeterministicCourseId({
    publisher_trainer_id: claims.publisher_trainer_id,
    source_course_id,
    content_fingerprint: contentFingerprint
  });

  // 4) Atomic idempotent publish.
  const published = await publish({
    courseId,
    normalized,
    createdByUserId: created_by_user_id,
    incomingSnapshot,
    deps: deps.persistDeps || {}
  });

  // 5) Drop memory only after confirmed success (including idempotent ack).
  removeSession(transferId);

  return {
    status: 'published',
    transfer_id: transferId,
    course_id: published.course_id,
    source_course_id,
    lessons_created: published.lessons_created,
    lessons_expected: published.lessons_expected,
    content_fingerprint: contentFingerprint
  };
}

export default {
  handleTrainerPublishFinalize
};
