/**
 * Trainer Publish INIT orchestration (Phase 1C — stateless).
 * Issues a CB-signed routing ticket only — no DB / no course records.
 */

import {
  loadCoordinatorPublicKey,
  loadCourseBuilderPrivateKey
} from '../../utils/serviceKeys.js';
import {
  assertCoordinatorSignedInitEnvelope,
  assertValidTrainerPublishInitMetadata,
  buildRoutingTicketClaims,
  generateStatelessTransferId,
  signRoutingTicket
} from '../../utils/trainerPublishInit.js';
import {
  TRAINER_PUBLISH_ERROR_CODES,
  trainerPublishError
} from '../../utils/trainerPublishErrors.js';
import { createTransferSession } from './transferMemoryStore.js';

/**
 * @param {import('express').Request} req
 * @param {Object} envelope - Unmodified parsed envelope (signature subject)
 * @param {Object} [deps] - Optional test overrides
 * @returns {Promise<{ status: string, transfer_id: string, routing_ticket: Object, expires_at: string }>}
 */
export async function handleTrainerPublishInit(req, envelope, deps = {}) {
  const loadCoordKey = deps.loadCoordinatorPublicKey || loadCoordinatorPublicKey;
  const loadPrivateKey = deps.loadCourseBuilderPrivateKey || loadCourseBuilderPrivateKey;

  // 1) Fail-closed Coordinator authentication over the full envelope.
  assertCoordinatorSignedInitEnvelope(req, envelope, loadCoordKey());

  // 2) Validate metadata before issuing any ticket.
  const meta = assertValidTrainerPublishInitMetadata(envelope.payload);

  const privateKey = loadPrivateKey();
  if (!privateKey) {
    throw trainerPublishError(
      503,
      TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_INTERNAL_ERROR,
      'Trainer Publish INIT cannot issue routing ticket: PRIVATE_KEY is not configured'
    );
  }

  const now = deps.now ? deps.now() : new Date();
  const expiresAt = new Date(now.getTime() + meta.ttl_seconds * 1000);
  const expUnix = Math.floor(expiresAt.getTime() / 1000);

  // 3) Stateless transfer identity (deterministic; no PostgreSQL).
  const transferId = generateStatelessTransferId(meta);

  const claims = buildRoutingTicketClaims({
    transfer_id: transferId,
    exp: expUnix,
    publisher_trainer_id: meta.publisher_trainer_id,
    organization_id: meta.organization_id,
    source_course_id: meta.source_course_id,
    transfer_sha256: meta.transfer_sha256,
    expected_chunk_count: meta.expected_chunk_count
  });

  const routingTicket = signRoutingTicket(claims, privateKey);

  // Seed isolated in-memory buffer for CHUNK reception (no database).
  const createSession = deps.createTransferSession || createTransferSession;
  createSession({
    transfer_id: transferId,
    publisher_trainer_id: meta.publisher_trainer_id,
    organization_id: meta.organization_id,
    source_course_id: meta.source_course_id,
    transfer_sha256: meta.transfer_sha256,
    expected_chunk_count: meta.expected_chunk_count,
    expires_at_ms: expiresAt.getTime()
  });

  return {
    status: 'initialized',
    transfer_id: transferId,
    routing_ticket: routingTicket,
    expires_at: expiresAt.toISOString()
  };
}

export default {
  handleTrainerPublishInit
};
