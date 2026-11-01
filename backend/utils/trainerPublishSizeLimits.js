/**
 * Configurable size / concurrency limits for Chunked Trainer Publish.
 *
 * Legacy single-shot compressed publish keeps a fixed 5 MiB decompress cap
 * (see MAX_DECOMPRESSED_TRAINER_COURSE_BYTES in compressedTrainerPublish.js).
 *
 * Defaults are intentionally below the 128 MiB design target: synchronous
 * gunzip+JSON.parse on a single Railway replica (numReplicas:1) can peak at
 * several× the JSON size and block the event loop. Operators may raise the
 * chunked decompress env up to the hard ceiling on larger memory instances.
 */

const MiB = 1024 * 1024;

/** Legacy + zip-bomb floor for any decompress path. */
export const LEGACY_MAX_DECOMPRESSED_BYTES = 5 * MiB;

/** Hard ceiling for chunked FINALIZE decompress (env cannot exceed). */
export const CHUNKED_MAX_DECOMPRESSED_BYTES_HARD_CEILING = 128 * MiB;

/** Default chunked FINALIZE decompress cap (safe for ~1 GiB RAM class). */
export const CHUNKED_MAX_DECOMPRESSED_BYTES_DEFAULT = 32 * MiB;

/** Hard ceiling for reassembled gzip bytes retained in memory. */
export const MAX_TRANSFER_DECODED_BYTES_HARD_CEILING = 32 * MiB;

/** Default max gzip bytes per transfer (raised from historical 8 MiB). */
export const MAX_TRANSFER_DECODED_BYTES_DEFAULT = 32 * MiB;

/** Historical concurrent sessions at 8 MiB each. */
export const MAX_CONCURRENT_TRANSFERS_LEGACY = 32;

/**
 * Default concurrent transfers at 32 MiB each.
 * 4 × 32 MiB = 128 MiB buffer budget (was 32 × 8 MiB = 256 MiB).
 */
export const MAX_CONCURRENT_TRANSFERS_DEFAULT = 4;

/** Absolute floor / ceiling for concurrency env. */
export const MAX_CONCURRENT_TRANSFERS_MIN = 1;
export const MAX_CONCURRENT_TRANSFERS_MAX = 32;

function parsePositiveInt(raw, fallback) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    return fallback;
  }
  return n;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Chunked FINALIZE only — max gunzip output / JSON UTF-8 bytes.
 * Env: TRAINER_PUBLISH_CHUNKED_MAX_DECOMPRESSED_BYTES
 */
export function getChunkedMaxDecompressedBytes(env = process.env) {
  const parsed = parsePositiveInt(
    env.TRAINER_PUBLISH_CHUNKED_MAX_DECOMPRESSED_BYTES,
    CHUNKED_MAX_DECOMPRESSED_BYTES_DEFAULT
  );
  return clamp(
    parsed,
    LEGACY_MAX_DECOMPRESSED_BYTES,
    CHUNKED_MAX_DECOMPRESSED_BYTES_HARD_CEILING
  );
}

/**
 * Max reassembled gzip bytes per transfer (CHUNK accumulate + FINALIZE check).
 * Env: TRAINER_PUBLISH_MAX_TRANSFER_DECODED_BYTES
 */
export function getMaxTransferDecodedBytes(env = process.env) {
  const parsed = parsePositiveInt(
    env.TRAINER_PUBLISH_MAX_TRANSFER_DECODED_BYTES,
    MAX_TRANSFER_DECODED_BYTES_DEFAULT
  );
  return clamp(parsed, MiB, MAX_TRANSFER_DECODED_BYTES_HARD_CEILING);
}

/**
 * Max concurrent in-memory transfer sessions.
 * Env: TRAINER_PUBLISH_MAX_CONCURRENT_TRANSFERS
 */
export function getMaxConcurrentTransfers(env = process.env) {
  const parsed = parsePositiveInt(
    env.TRAINER_PUBLISH_MAX_CONCURRENT_TRANSFERS,
    MAX_CONCURRENT_TRANSFERS_DEFAULT
  );
  return clamp(
    parsed,
    MAX_CONCURRENT_TRANSFERS_MIN,
    MAX_CONCURRENT_TRANSFERS_MAX
  );
}

export default {
  LEGACY_MAX_DECOMPRESSED_BYTES,
  CHUNKED_MAX_DECOMPRESSED_BYTES_HARD_CEILING,
  CHUNKED_MAX_DECOMPRESSED_BYTES_DEFAULT,
  MAX_TRANSFER_DECODED_BYTES_HARD_CEILING,
  MAX_TRANSFER_DECODED_BYTES_DEFAULT,
  MAX_CONCURRENT_TRANSFERS_DEFAULT,
  getChunkedMaxDecompressedBytes,
  getMaxTransferDecodedBytes,
  getMaxConcurrentTransfers
};
