/**
 * Trainer Publish CHUNK orchestration (Phase 3 — in-memory only).
 */

import {
  loadCoordinatorPublicKey,
  loadCourseBuilderPublicKey
} from '../../utils/serviceKeys.js';
import {
  assertCoordinatorSignedChunkEnvelope,
  assertValidChunkPayload,
  assertValidRoutingTicketForChunk
} from '../../utils/trainerPublishChunk.js';
import { storeChunk } from './transferMemoryStore.js';

/**
 * @param {import('express').Request} req
 * @param {Object} envelope
 * @param {Object} [deps]
 */
export async function handleTrainerPublishChunk(req, envelope, deps = {}) {
  const loadCoordKey = deps.loadCoordinatorPublicKey || loadCoordinatorPublicKey;
  const loadCbPublic = deps.loadCourseBuilderPublicKey || loadCourseBuilderPublicKey;
  const store = deps.storeChunk || storeChunk;

  assertCoordinatorSignedChunkEnvelope(req, envelope, loadCoordKey());

  const claims = assertValidRoutingTicketForChunk(
    envelope.payload,
    loadCbPublic()
  );

  const { chunk_index, decoded } = assertValidChunkPayload(envelope.payload);

  // Session must already exist (seeded by INIT). Metadata binding already checked vs ticket.
  void claims;
  const ack = store(String(claims.transfer_id), chunk_index, decoded);

  return {
    status: ack.status,
    transfer_id: ack.transfer_id,
    chunk_index: ack.chunk_index,
    received_chunks: ack.received_chunks,
    expected_chunk_count: ack.expected_chunk_count
  };
}

export default {
  handleTrainerPublishChunk
};
