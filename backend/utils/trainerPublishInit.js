/**
 * Isolated Trainer Publish INIT helpers (Chunked transfer Phase 1C).
 * Does not touch Full AI Generation or legacy Trainer Publish paths.
 */

import crypto from 'node:crypto';
import { v5 as uuidv5 } from 'uuid';
import { generateSignature, verifySignature } from './signature.js';
import {
  TRAINER_PUBLISH_ERROR_CODES,
  trainerPublishError
} from './trainerPublishErrors.js';

/**
 * Application namespace for deterministic Trainer Publish transfer IDs (UUID v5).
 * Not a DB key — binds in-memory transfer identity across repeated INIT calls.
 */
export const TRAINER_PUBLISH_TRANSFER_NAMESPACE =
  '7c9e6679-7425-40de-944b-e07fc1f90ae8';

export const TRAINER_PUBLISH_INIT_REQUESTER = 'content-studio';
export const TRAINER_PUBLISH_INIT_ACTION = 'trainer_publish_init';
export const TRAINER_PUBLISH_INIT_TARGET = 'course-builder-service';

export const TRAINER_PUBLISH_TICKET_ISS = 'course-builder-service';
export const TRAINER_PUBLISH_TICKET_AUD = 'coordinator';
export const TRAINER_PUBLISH_TICKET_REQUESTER = 'content-studio';
export const TRAINER_PUBLISH_TICKET_DEST = 'course-builder-service';
export const TRAINER_PUBLISH_TICKET_OPS = Object.freeze(['chunk', 'finalize']);

export const DEFAULT_TRANSFER_TTL_SECONDS = 60 * 60; // 1 hour
/** Aligned with in-memory CHUNK buffer capacity (Phase 3). */
export const MAX_EXPECTED_CHUNK_COUNT = 512;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(status, errorCode, message) {
  return trainerPublishError(status, errorCode, message);
}

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/**
 * Exact INIT identity — must not match legacy publish or Full AI actions.
 * @param {string} requesterService
 * @param {Object} payload
 * @returns {boolean}
 */
export function isTrainerPublishInitRequest(requesterService, payload) {
  return (
    requesterService === TRAINER_PUBLISH_INIT_REQUESTER &&
    payload != null &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    payload.action === TRAINER_PUBLISH_INIT_ACTION &&
    payload.targetService === TRAINER_PUBLISH_INIT_TARGET
  );
}

/**
 * Validate INIT metadata before issuing a routing ticket.
 * transfer_sha256 = SHA-256 hex of the exact gzip bytes CS will chunk (transport integrity).
 * publisher_trainer_id = CS-attested directory user UUID (not independently JWT-verified by CB).
 *
 * @param {Object} payload
 * @returns {{
 *   publisher_trainer_id: string,
 *   organization_id: string|null,
 *   source_course_id: string,
 *   transfer_sha256: string,
 *   expected_chunk_count: number,
 *   ttl_seconds: number
 * }}
 */
export function assertValidTrainerPublishInitMetadata(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'Trainer Publish INIT payload must be an object'
    );
  }

  if (!isUuid(payload.publisher_trainer_id)) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'Trainer Publish INIT requires "publisher_trainer_id" as a valid UUID'
    );
  }
  const publisherTrainerId = payload.publisher_trainer_id.trim().toLowerCase();

  let organizationId = null;
  if (payload.organization_id !== undefined && payload.organization_id !== null) {
    if (!isUuid(payload.organization_id)) {
      throw httpError(
        400,
        TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
        'Trainer Publish INIT "organization_id" must be a valid UUID when provided'
      );
    }
    organizationId = payload.organization_id.trim().toLowerCase();
  }

  const sourceCourseId = payload.source_course_id;
  if (
    sourceCourseId == null ||
    typeof sourceCourseId !== 'string' ||
    sourceCourseId.trim() === ''
  ) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'Trainer Publish INIT requires non-empty "source_course_id"'
    );
  }

  const transferSha256 = payload.transfer_sha256;
  if (
    typeof transferSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(transferSha256)
  ) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      'Trainer Publish INIT requires "transfer_sha256" as a 64-character hex SHA-256 of the exact gzip transfer bytes'
    );
  }

  const rawCount = payload.expected_chunk_count;
  const expectedChunkCount = Number(rawCount);
  if (
    !Number.isInteger(expectedChunkCount) ||
    expectedChunkCount < 1 ||
    expectedChunkCount > MAX_EXPECTED_CHUNK_COUNT
  ) {
    throw httpError(
      400,
      TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
      `Trainer Publish INIT requires "expected_chunk_count" as an integer from 1 to ${MAX_EXPECTED_CHUNK_COUNT}`
    );
  }

  let ttlSeconds = DEFAULT_TRANSFER_TTL_SECONDS;
  if (payload.ttl_seconds !== undefined) {
    const ttl = Number(payload.ttl_seconds);
    if (!Number.isInteger(ttl) || ttl < 60 || ttl > 24 * 60 * 60) {
      throw httpError(
        400,
        TRAINER_PUBLISH_ERROR_CODES.TRANSFER_METADATA_INVALID,
        'Trainer Publish INIT "ttl_seconds" must be an integer between 60 and 86400'
      );
    }
    ttlSeconds = ttl;
  }

  return {
    publisher_trainer_id: publisherTrainerId,
    organization_id: organizationId,
    source_course_id: sourceCourseId.trim(),
    transfer_sha256: transferSha256.toLowerCase(),
    expected_chunk_count: expectedChunkCount,
    ttl_seconds: ttlSeconds
  };
}

/**
 * Fail-closed Coordinator inbound authentication for Trainer Publish INIT only.
 * @param {import('express').Request} req
 * @param {Object} envelope - Full parsed JSON envelope (must match signed object)
 * @param {string|null} coordinatorPublicKeyPem
 */
export function assertCoordinatorSignedInitEnvelope(
  req,
  envelope,
  coordinatorPublicKeyPem
) {
  const serviceName = String(
    req?.headers?.['x-service-name'] || req?.headers?.['X-Service-Name'] || ''
  ).trim();
  const signature = String(
    req?.headers?.['x-signature'] || req?.headers?.['X-Signature'] || ''
  ).trim();

  if (serviceName !== 'coordinator') {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_UNAUTHORIZED,
      'Trainer Publish INIT requires X-Service-Name exactly "coordinator"'
    );
  }

  if (!signature) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_UNAUTHORIZED,
      'Trainer Publish INIT requires X-Signature header'
    );
  }

  if (!coordinatorPublicKeyPem) {
    throw httpError(
      503,
      TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_INTERNAL_ERROR,
      'Trainer Publish INIT authentication is unavailable: COORDINATOR_PUBLIC_KEY is not configured'
    );
  }

  const ok = verifySignature(
    'coordinator',
    signature,
    coordinatorPublicKeyPem,
    envelope
  );
  if (!ok) {
    throw httpError(
      401,
      TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_UNAUTHORIZED,
      'Trainer Publish INIT Coordinator signature verification failed'
    );
  }
}

/**
 * Deterministic claims object — property insertion order is part of the contract.
 * organization_id is included only when present (fixed relative position when set).
 * @param {Object} params
 * @returns {Object}
 */
export function buildRoutingTicketClaims({
  transfer_id,
  exp,
  publisher_trainer_id,
  organization_id = null,
  source_course_id,
  transfer_sha256,
  expected_chunk_count
}) {
  const claims = {};
  claims.transfer_id = transfer_id;
  claims.iss = TRAINER_PUBLISH_TICKET_ISS;
  claims.aud = TRAINER_PUBLISH_TICKET_AUD;
  claims.requester = TRAINER_PUBLISH_TICKET_REQUESTER;
  claims.dest = TRAINER_PUBLISH_TICKET_DEST;
  claims.ops = [...TRAINER_PUBLISH_TICKET_OPS];
  claims.exp = exp;
  claims.publisher_trainer_id = publisher_trainer_id;
  if (organization_id) {
    claims.organization_id = organization_id;
  }
  claims.source_course_id = source_course_id;
  claims.transfer_sha256 = transfer_sha256;
  claims.expected_chunk_count = expected_chunk_count;
  return claims;
}

/**
 * @param {Object} claims
 * @param {string} courseBuilderPrivateKeyPem
 * @returns {{ claims: Object, signature: string }}
 */
export function signRoutingTicket(claims, courseBuilderPrivateKeyPem) {
  if (!courseBuilderPrivateKeyPem) {
    throw httpError(
      503,
      TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_INTERNAL_ERROR,
      'Trainer Publish INIT cannot issue routing ticket: PRIVATE_KEY is not configured'
    );
  }

  const signature = generateSignature(
    TRAINER_PUBLISH_TICKET_ISS,
    courseBuilderPrivateKeyPem,
    claims
  );

  return {
    claims,
    signature
  };
}

/**
 * Random UUID (tests / non-deterministic callers). Prefer generateStatelessTransferId for INIT.
 * @returns {string} UUID v4
 */
export function generateTransferId() {
  return crypto.randomUUID();
}

/**
 * Stateless transfer_id: stable for identical INIT metadata; isolates publishers.
 * Name: content-studio|publisher_trainer_id|[organization_id|]|source_course_id|transfer_sha256|expected_chunk_count
 *
 * @param {{
 *   publisher_trainer_id: string,
 *   organization_id?: string|null,
 *   source_course_id: string,
 *   transfer_sha256: string,
 *   expected_chunk_count: number
 * }} meta
 * @returns {string} UUID v5
 */
export function generateStatelessTransferId(meta) {
  const parts = [
    TRAINER_PUBLISH_INIT_REQUESTER,
    String(meta.publisher_trainer_id).toLowerCase()
  ];
  if (meta.organization_id) {
    parts.push(String(meta.organization_id).toLowerCase());
  }
  parts.push(
    String(meta.source_course_id),
    String(meta.transfer_sha256).toLowerCase(),
    String(meta.expected_chunk_count)
  );
  return uuidv5(parts.join('|'), TRAINER_PUBLISH_TRANSFER_NAMESPACE);
}

export default {
  isTrainerPublishInitRequest,
  assertValidTrainerPublishInitMetadata,
  assertCoordinatorSignedInitEnvelope,
  buildRoutingTicketClaims,
  signRoutingTicket,
  generateTransferId,
  generateStatelessTransferId,
  TRAINER_PUBLISH_INIT_REQUESTER,
  TRAINER_PUBLISH_INIT_ACTION,
  TRAINER_PUBLISH_INIT_TARGET,
  TRAINER_PUBLISH_TRANSFER_NAMESPACE,
  DEFAULT_TRANSFER_TTL_SECONDS
};
