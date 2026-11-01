/**
 * Isolated GZIP+Base64 expansion for Content Studio Trainer Publish only.
 * Does not alter uncompressed or Full AI Generation envelopes.
 */

import zlib from 'node:zlib';
import { LEGACY_MAX_DECOMPRESSED_BYTES } from './trainerPublishSizeLimits.js';

export const COMPRESSED_TRAINER_PUBLISH_REQUESTER = 'content-studio';
export const COMPRESSED_TRAINER_PUBLISH_ACTION =
  'send this trainer course to publish';
export const COMPRESSED_TRAINER_PUBLISH_TARGET = 'course-builder-service';
export const COMPRESSED_TRAINER_PUBLISH_ENCODING = 'gzip+base64';

/**
 * Legacy / single-shot compressed Trainer Publish decompress cap (zip-bomb protection).
 * Chunked FINALIZE uses getChunkedMaxDecompressedBytes() instead.
 */
export const MAX_DECOMPRESSED_TRAINER_COURSE_BYTES = LEGACY_MAX_DECOMPRESSED_BYTES;

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

/**
 * Exact Trainer Publish identity (Content Studio → Course Builder).
 * @param {string} requesterService
 * @param {Object} payload
 * @returns {boolean}
 */
export function isTrainerPublishIdentity(requesterService, payload) {
  return (
    requesterService === COMPRESSED_TRAINER_PUBLISH_REQUESTER &&
    payload != null &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    payload.action === COMPRESSED_TRAINER_PUBLISH_ACTION &&
    payload.targetService === COMPRESSED_TRAINER_PUBLISH_TARGET
  );
}

/**
 * True when either compression field is declared on the payload.
 * @param {Object} payload
 * @returns {boolean}
 */
export function hasTrainerPublishCompressionMetadata(payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  return (
    payload.course_encoding !== undefined ||
    payload.course_compressed !== undefined
  );
}

/**
 * True when the payload is a complete, valid compressed Trainer Publish contract
 * ready for decompression (identity + encoding + non-empty string blob).
 * @param {string} requesterService
 * @param {Object} payload
 * @returns {boolean}
 */
export function isCompressedTrainerPublishRequest(requesterService, payload) {
  return (
    isTrainerPublishIdentity(requesterService, payload) &&
    payload.course_encoding === COMPRESSED_TRAINER_PUBLISH_ENCODING &&
    typeof payload.course_compressed === 'string' &&
    payload.course_compressed.length > 0
  );
}

/**
 * Reject half-declared / unsupported compression metadata for Trainer Publish.
 * Call only when identity matches and at least one compression field is present.
 * @param {Object} payload
 */
export function assertValidCompressedTrainerPublishMetadata(payload) {
  const hasEncoding = payload.course_encoding !== undefined;
  const hasCompressed = payload.course_compressed !== undefined;

  if (hasCompressed && !hasEncoding) {
    throw badRequest(
      'Compressed trainer publish requires "course_encoding" when "course_compressed" is present'
    );
  }

  if (
    hasEncoding &&
    payload.course_encoding !== COMPRESSED_TRAINER_PUBLISH_ENCODING
  ) {
    throw badRequest(
      `Unsupported course_encoding "${String(payload.course_encoding)}". Expected "${COMPRESSED_TRAINER_PUBLISH_ENCODING}"`
    );
  }

  // course_encoding is gzip+base64 from here
  if (!hasCompressed) {
    throw badRequest(
      'Compressed trainer publish with course_encoding "gzip+base64" requires "course_compressed"'
    );
  }

  if (typeof payload.course_compressed !== 'string') {
    throw badRequest(
      'course_compressed must be a non-empty Base64 string'
    );
  }

  if (payload.course_compressed.length === 0) {
    throw badRequest(
      'course_compressed must be a non-empty Base64 string'
    );
  }
}

/**
 * Validate recovered trainer course object against the existing ingest contract subset.
 * @param {unknown} course
 */
export function assertValidRestoredTrainerCourse(course) {
  if (!course || typeof course !== 'object' || Array.isArray(course)) {
    throw badRequest(
      'Compressed trainer course must decompress to a JSON object'
    );
  }

  if (
    course.trainer_id == null ||
    String(course.trainer_id).trim() === ''
  ) {
    throw badRequest(
      'Compressed trainer course is missing required field "trainer_id"'
    );
  }

  if (course.course_id == null || String(course.course_id).trim() === '') {
    throw badRequest(
      'Compressed trainer course is missing required field "course_id"'
    );
  }

  if (!Array.isArray(course.topics) || course.topics.length === 0) {
    throw badRequest(
      'Compressed trainer course must include a non-empty "topics" array'
    );
  }

  for (let i = 0; i < course.topics.length; i++) {
    const topic = course.topics[i];
    if (!topic || typeof topic !== 'object' || Array.isArray(topic)) {
      throw badRequest(
        `Compressed trainer course topics[${i}] must be an object`
      );
    }
    if (!Array.isArray(topic.contents)) {
      throw badRequest(
        `Compressed trainer course topics[${i}] must include a "contents" array`
      );
    }
  }
}

/**
 * Gunzip + JSON.parse a compressed trainer course buffer (exact GZIP bytes).
 * Shared by legacy compressed Trainer Publish and chunked FINALIZE reassembly.
 *
 * @param {Buffer} compressedBuf
 * @param {Object} [options]
 * @param {number} [options.maxOutputLength] - zip-bomb bound (defaults to legacy 5 MiB)
 * @returns {Object}
 */
export function decodeCompressedTrainerCourseBuffer(compressedBuf, options = {}) {
  if (!Buffer.isBuffer(compressedBuf) || compressedBuf.length === 0) {
    throw badRequest('Compressed trainer course GZIP buffer is empty');
  }

  const maxOutputLength =
    typeof options.maxOutputLength === 'number' &&
    Number.isFinite(options.maxOutputLength) &&
    options.maxOutputLength > 0
      ? Math.floor(options.maxOutputLength)
      : MAX_DECOMPRESSED_TRAINER_COURSE_BYTES;

  let decompressedBuf;
  try {
    decompressedBuf = zlib.gunzipSync(compressedBuf, {
      maxOutputLength
    });
  } catch (err) {
    const msg = String(err?.message || err);
    const code = String(err?.code || '');
    if (
      code === 'ERR_BUFFER_TOO_LARGE' ||
      /maxOutputLength|exceeds|too large|larger than/i.test(msg)
    ) {
      throw badRequest(
        `Compressed trainer course exceeds maximum decompressed size of ${maxOutputLength} bytes`
      );
    }
    throw badRequest('Compressed trainer course GZIP decompression failed');
  }

  if (
    !decompressedBuf ||
    decompressedBuf.length === 0 ||
    decompressedBuf.length > maxOutputLength
  ) {
    throw badRequest(
      `Compressed trainer course exceeds maximum decompressed size of ${maxOutputLength} bytes`
    );
  }

  let course;
  try {
    course = JSON.parse(decompressedBuf.toString('utf8'));
  } catch {
    throw badRequest('Compressed trainer course is not valid JSON after decompression');
  }

  assertValidRestoredTrainerCourse(course);
  return course;
}

/**
 * Base64-decode + gunzip + JSON.parse a compressed trainer course blob.
 * @param {string} courseCompressed
 * @returns {Object}
 */
export function decodeCompressedTrainerCourse(courseCompressed) {
  let compressedBuf;
  try {
    compressedBuf = Buffer.from(courseCompressed, 'base64');
  } catch {
    throw badRequest('Compressed trainer course Base64 decoding failed');
  }

  if (!compressedBuf || compressedBuf.length === 0) {
    throw badRequest('Compressed trainer course Base64 decoding produced empty data');
  }

  // Reject strings that are not valid Base64 (Node's Buffer.from is permissive).
  const compact = String(courseCompressed).replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 !== 0) {
    throw badRequest('Compressed trainer course Base64 decoding failed');
  }

  return decodeCompressedTrainerCourseBuffer(compressedBuf);
}

/**
 * When the explicit compressed Trainer Publish contract matches, expand payload
 * to the legacy trainer-course shape expected by determineTargetService /
 * handleContentStudioIntegration. Otherwise return the same payload reference.
 *
 * Explicit-but-malformed compression metadata throws status 400 (no legacy fallthrough).
 *
 * @param {string} requesterService
 * @param {Object} payloadObject
 * @returns {Object}
 */
export function expandCompressedTrainerPublishIfNeeded(
  requesterService,
  payloadObject
) {
  if (!isTrainerPublishIdentity(requesterService, payloadObject)) {
    return payloadObject;
  }

  // Legacy uncompressed Trainer Publish: no compression fields → unchanged.
  if (!hasTrainerPublishCompressionMetadata(payloadObject)) {
    return payloadObject;
  }

  // Explicit compressed attempt — validate metadata before any routing/dispatch.
  assertValidCompressedTrainerPublishMetadata(payloadObject);

  const course = decodeCompressedTrainerCourse(payloadObject.course_compressed);

  const {
    course_encoding: _encoding,
    course_compressed: _compressed,
    ...routingShell
  } = payloadObject;

  return {
    ...routingShell,
    ...course
  };
}

export default {
  isTrainerPublishIdentity,
  hasTrainerPublishCompressionMetadata,
  isCompressedTrainerPublishRequest,
  assertValidCompressedTrainerPublishMetadata,
  assertValidRestoredTrainerCourse,
  decodeCompressedTrainerCourseBuffer,
  decodeCompressedTrainerCourse,
  expandCompressedTrainerPublishIfNeeded,
  MAX_DECOMPRESSED_TRAINER_COURSE_BYTES,
  COMPRESSED_TRAINER_PUBLISH_REQUESTER,
  COMPRESSED_TRAINER_PUBLISH_ACTION,
  COMPRESSED_TRAINER_PUBLISH_TARGET,
  COMPRESSED_TRAINER_PUBLISH_ENCODING
};
