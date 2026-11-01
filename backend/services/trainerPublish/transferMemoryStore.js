/**
 * Isolated in-memory Trainer Publish transfer buffers (CHUNK phase).
 * Not shared with cache.service — single-process / single-replica assumption.
 */

import {
  TRAINER_PUBLISH_ERROR_CODES,
  trainerPublishError
} from '../../utils/trainerPublishErrors.js';

/** Max Base64 characters per chunk_data field. */
export const MAX_CHUNK_BASE64_CHARS = 72_000;

/** Max total decoded bytes retained per transfer. */
export const MAX_TRANSFER_DECODED_BYTES = 8 * 1024 * 1024;

/** Max concurrent non-expired transfers in this process. */
export const MAX_CONCURRENT_TRANSFERS = 32;

/** Max chunk count accepted for in-memory buffering (stricter than INIT metadata max). */
export const MAX_MEMORY_CHUNK_COUNT = 512;

/**
 * @typedef {Object} TransferSession
 * @property {string} transfer_id
 * @property {string} publisher_trainer_id
 * @property {string|null} organization_id
 * @property {string} source_course_id
 * @property {string} transfer_sha256
 * @property {number} expected_chunk_count
 * @property {number} expires_at_ms
 * @property {Map<number, Buffer>} chunks
 * @property {number} totalDecodedBytes
 */

/** @type {Map<string, TransferSession>} */
const sessions = new Map();

function httpError(status, errorCode, message) {
  return trainerPublishError(status, errorCode, message);
}

export function sweepExpiredTransfers(nowMs = Date.now()) {
  for (const [id, session] of sessions.entries()) {
    if (session.expires_at_ms <= nowMs) {
      sessions.delete(id);
    }
  }
}

/**
 * Create an empty transfer buffer from verified INIT ticket claims.
 * @param {Object} params
 * @returns {TransferSession}
 */
export function createTransferSession({
  transfer_id,
  publisher_trainer_id,
  organization_id = null,
  source_course_id,
  transfer_sha256,
  expected_chunk_count,
  expires_at_ms
}) {
  sweepExpiredTransfers();

  if (sessions.has(transfer_id)) {
    const existing = sessions.get(transfer_id);
    if (existing.expires_at_ms > Date.now()) {
      // Idempotent INIT re-seed: keep existing chunks if still valid and metadata match.
      const same =
        existing.publisher_trainer_id === publisher_trainer_id &&
        existing.source_course_id === source_course_id &&
        existing.transfer_sha256 === transfer_sha256 &&
        existing.expected_chunk_count === expected_chunk_count &&
        (existing.organization_id || null) === (organization_id || null);
      if (!same) {
        throw httpError(
          409,
          TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_CONFLICT,
          'Trainer Publish transfer_id is already active with conflicting metadata'
        );
      }
      existing.expires_at_ms = Math.max(existing.expires_at_ms, expires_at_ms);
      return existing;
    }
    sessions.delete(transfer_id);
  }

  if (sessions.size >= MAX_CONCURRENT_TRANSFERS) {
    throw httpError(
      503,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SIZE_EXCEEDED,
      `Trainer Publish transfer capacity exceeded (max ${MAX_CONCURRENT_TRANSFERS} concurrent)`
    );
  }

  if (
    !Number.isInteger(expected_chunk_count) ||
    expected_chunk_count < 1 ||
    expected_chunk_count > MAX_MEMORY_CHUNK_COUNT
  ) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      `expected_chunk_count must be an integer from 1 to ${MAX_MEMORY_CHUNK_COUNT} for in-memory transfers`
    );
  }

  /** @type {TransferSession} */
  const session = {
    transfer_id,
    publisher_trainer_id,
    organization_id: organization_id || null,
    source_course_id,
    transfer_sha256,
    expected_chunk_count,
    expires_at_ms,
    chunks: new Map(),
    totalDecodedBytes: 0
  };
  sessions.set(transfer_id, session);
  return session;
}

/**
 * @param {string} transferId
 * @returns {TransferSession|null}
 */
export function getTransferSession(transferId) {
  sweepExpiredTransfers();
  const session = sessions.get(transferId);
  if (!session) return null;
  if (session.expires_at_ms <= Date.now()) {
    sessions.delete(transferId);
    return null;
  }
  return session;
}

/**
 * Store or acknowledge a chunk. Session must already exist (seeded by INIT).
 * @returns {{ status: string, transfer_id: string, chunk_index: number, received_chunks: number, expected_chunk_count: number, duplicate: boolean }}
 */
export function storeChunk(transferId, chunkIndex, decodedBuf) {
  const session = getTransferSession(transferId);
  if (!session) {
    throw httpError(
      410,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SESSION_GONE,
      'Trainer Publish transfer buffer not found or expired; restart from INIT'
    );
  }

  if (
    !Number.isInteger(chunkIndex) ||
    chunkIndex < 0 ||
    chunkIndex >= session.expected_chunk_count
  ) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      `chunk_index must be an integer in [0, ${session.expected_chunk_count - 1}]`
    );
  }

  const existing = session.chunks.get(chunkIndex);
  if (existing) {
    if (Buffer.compare(existing, decodedBuf) === 0) {
      return {
        status: 'chunk_received',
        transfer_id: session.transfer_id,
        chunk_index: chunkIndex,
        received_chunks: session.chunks.size,
        expected_chunk_count: session.expected_chunk_count,
        duplicate: true
      };
    }
    throw httpError(
      409,
      TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_CONFLICT,
      `Conflicting chunk payload for transfer index ${chunkIndex}`
    );
  }

  const nextTotal = session.totalDecodedBytes + decodedBuf.length;
  if (nextTotal > MAX_TRANSFER_DECODED_BYTES) {
    throw httpError(
      413,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SIZE_EXCEEDED,
      `Trainer Publish transfer exceeds maximum decoded size of ${MAX_TRANSFER_DECODED_BYTES} bytes`
    );
  }

  session.chunks.set(chunkIndex, decodedBuf);
  session.totalDecodedBytes = nextTotal;

  return {
    status: 'chunk_received',
    transfer_id: session.transfer_id,
    chunk_index: chunkIndex,
    received_chunks: session.chunks.size,
    expected_chunk_count: session.expected_chunk_count,
    duplicate: false
  };
}

/**
 * Reassemble gzip bytes in chunk_index order. Does not delete the session.
 * @param {string} transferId
 * @returns {Buffer}
 */
export function reassembleTransferBytes(transferId) {
  const session = getTransferSession(transferId);
  if (!session) {
    throw httpError(
      410,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SESSION_GONE,
      'Trainer Publish transfer buffer not found or expired; restart from INIT'
    );
  }

  const missing = [];
  for (let i = 0; i < session.expected_chunk_count; i++) {
    if (!session.chunks.has(i)) {
      missing.push(i);
    }
  }
  if (missing.length > 0) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_INCOMPLETE,
      `Trainer Publish transfer is incomplete; missing chunk indexes: ${missing.join(',')}`
    );
  }

  const parts = [];
  for (let i = 0; i < session.expected_chunk_count; i++) {
    parts.push(session.chunks.get(i));
  }
  return Buffer.concat(parts);
}

/**
 * Remove a transfer session (call only after confirmed successful publish).
 * @param {string} transferId
 * @returns {boolean}
 */
export function removeTransferSession(transferId) {
  return sessions.delete(transferId);
}

/** Test helper: wipe all sessions. */
export function clearAllTransferSessions() {
  sessions.clear();
}

/** Test helper */
export function getTransferSessionCount() {
  sweepExpiredTransfers();
  return sessions.size;
}

export default {
  createTransferSession,
  getTransferSession,
  storeChunk,
  reassembleTransferBytes,
  removeTransferSession,
  sweepExpiredTransfers,
  clearAllTransferSessions,
  getTransferSessionCount,
  MAX_CHUNK_BASE64_CHARS,
  MAX_TRANSFER_DECODED_BYTES,
  MAX_CONCURRENT_TRANSFERS,
  MAX_MEMORY_CHUNK_COUNT
};
