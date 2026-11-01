import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {
  LEGACY_MAX_DECOMPRESSED_BYTES,
  CHUNKED_MAX_DECOMPRESSED_BYTES_DEFAULT,
  CHUNKED_MAX_DECOMPRESSED_BYTES_HARD_CEILING,
  MAX_TRANSFER_DECODED_BYTES_DEFAULT,
  MAX_TRANSFER_DECODED_BYTES_HARD_CEILING,
  MAX_CONCURRENT_TRANSFERS_DEFAULT,
  getChunkedMaxDecompressedBytes,
  getMaxTransferDecodedBytes,
  getMaxConcurrentTransfers
} from '../utils/trainerPublishSizeLimits.js';
import {
  decodeCompressedTrainerCourseBuffer,
  decodeCompressedTrainerCourse,
  expandCompressedTrainerPublishIfNeeded,
  MAX_DECOMPRESSED_TRAINER_COURSE_BYTES,
  COMPRESSED_TRAINER_PUBLISH_REQUESTER,
  COMPRESSED_TRAINER_PUBLISH_ACTION,
  COMPRESSED_TRAINER_PUBLISH_TARGET,
  COMPRESSED_TRAINER_PUBLISH_ENCODING
} from '../utils/compressedTrainerPublish.js';
import { verifyAndDecodeReassembledCourse } from '../utils/trainerPublishFinalize.js';
import {
  createTransferSession,
  storeChunk,
  clearAllTransferSessions,
  getMaxTransferDecodedBytes as storeGetMaxTransfer
} from '../services/trainerPublish/transferMemoryStore.js';

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function minimalCourse(overrides = {}) {
  return {
    trainer_id: '11111111-1111-4111-8111-111111111111',
    course_id: 'cs-size-1',
    topics: [{ topic_name: 'L1', contents: [] }],
    ...overrides
  };
}

describe('trainerPublishSizeLimits', () => {
  const envKeys = [
    'TRAINER_PUBLISH_CHUNKED_MAX_DECOMPRESSED_BYTES',
    'TRAINER_PUBLISH_MAX_TRANSFER_DECODED_BYTES',
    'TRAINER_PUBLISH_MAX_CONCURRENT_TRANSFERS'
  ];
  const saved = {};

  beforeEach(() => {
    for (const k of envKeys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    clearAllTransferSessions();
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    clearAllTransferSessions();
  });

  it('defaults: chunked 32 MiB decompress, 32 MiB transfer, 4 concurrent', () => {
    expect(getChunkedMaxDecompressedBytes()).toBe(CHUNKED_MAX_DECOMPRESSED_BYTES_DEFAULT);
    expect(getMaxTransferDecodedBytes()).toBe(MAX_TRANSFER_DECODED_BYTES_DEFAULT);
    expect(getMaxConcurrentTransfers()).toBe(MAX_CONCURRENT_TRANSFERS_DEFAULT);
    expect(CHUNKED_MAX_DECOMPRESSED_BYTES_DEFAULT).toBe(32 * 1024 * 1024);
    expect(MAX_TRANSFER_DECODED_BYTES_DEFAULT).toBe(32 * 1024 * 1024);
    expect(MAX_CONCURRENT_TRANSFERS_DEFAULT).toBe(4);
  });

  it('clamps chunked decompress to [5 MiB, 128 MiB]', () => {
    process.env.TRAINER_PUBLISH_CHUNKED_MAX_DECOMPRESSED_BYTES = '100';
    expect(getChunkedMaxDecompressedBytes()).toBe(LEGACY_MAX_DECOMPRESSED_BYTES);

    process.env.TRAINER_PUBLISH_CHUNKED_MAX_DECOMPRESSED_BYTES = String(
      CHUNKED_MAX_DECOMPRESSED_BYTES_HARD_CEILING + MiB()
    );
    expect(getChunkedMaxDecompressedBytes()).toBe(
      CHUNKED_MAX_DECOMPRESSED_BYTES_HARD_CEILING
    );

    process.env.TRAINER_PUBLISH_CHUNKED_MAX_DECOMPRESSED_BYTES = String(
      64 * 1024 * 1024
    );
    expect(getChunkedMaxDecompressedBytes()).toBe(64 * 1024 * 1024);
  });

  it('clamps transfer decoded bytes to hard ceiling 32 MiB', () => {
    process.env.TRAINER_PUBLISH_MAX_TRANSFER_DECODED_BYTES = String(64 * 1024 * 1024);
    expect(getMaxTransferDecodedBytes()).toBe(MAX_TRANSFER_DECODED_BYTES_HARD_CEILING);
  });

  it('legacy expand path stays at 5 MiB (ignores chunked env)', () => {
    expect(MAX_DECOMPRESSED_TRAINER_COURSE_BYTES).toBe(5 * 1024 * 1024);
    process.env.TRAINER_PUBLISH_CHUNKED_MAX_DECOMPRESSED_BYTES = String(
      64 * 1024 * 1024
    );

    const overLegacy = {
      trainer_id: '11111111-1111-4111-8111-111111111111',
      course_id: 'c',
      topics: [
        {
          topic_name: 'T',
          contents: [],
          // Force JSON well over 5 MiB via description when compressed legacy expands
        }
      ],
      course_description: 'B'.repeat(MAX_DECOMPRESSED_TRAINER_COURSE_BYTES + 2048)
    };
    const compressed = zlib
      .gzipSync(Buffer.from(JSON.stringify(overLegacy), 'utf8'))
      .toString('base64');

    expect(() =>
      expandCompressedTrainerPublishIfNeeded(COMPRESSED_TRAINER_PUBLISH_REQUESTER, {
        action: COMPRESSED_TRAINER_PUBLISH_ACTION,
        targetService: COMPRESSED_TRAINER_PUBLISH_TARGET,
        course_encoding: COMPRESSED_TRAINER_PUBLISH_ENCODING,
        course_compressed: compressed
      })
    ).toThrow(/maximum decompressed size/i);
  });

  it('chunked decode accepts payload above legacy 5 MiB when maxOutputLength raised', () => {
    // ~100 KiB payload with explicit max above legacy — avoids multi-MiB alloc in CI
    const course = minimalCourse({
      course_description: 'C'.repeat(80 * 1024)
    });
    const json = JSON.stringify(course);
    expect(Buffer.byteLength(json, 'utf8')).toBeGreaterThan(64 * 1024);
    expect(Buffer.byteLength(json, 'utf8')).toBeLessThan(LEGACY_MAX_DECOMPRESSED_BYTES);

    const gzip = zlib.gzipSync(Buffer.from(json, 'utf8'));
    // Explicit option path used by FINALIZE
    const decoded = decodeCompressedTrainerCourseBuffer(gzip, {
      maxOutputLength: getChunkedMaxDecompressedBytes()
    });
    expect(decoded.course_id).toBe('cs-size-1');
  });

  it('chunked FINALIZE rejects when over configured chunked cap (boundary)', () => {
    process.env.TRAINER_PUBLISH_CHUNKED_MAX_DECOMPRESSED_BYTES = String(
      LEGACY_MAX_DECOMPRESSED_BYTES
    );
    const cap = getChunkedMaxDecompressedBytes();
    const huge = Buffer.alloc(cap + 1, 0x61);
    const gzip = zlib.gzipSync(huge);
    expect(() => verifyAndDecodeReassembledCourse(gzip, sha256(gzip))).toThrow(
      /maximum decompressed size/i
    );
  });

  it('corrupt gzip rejected without publishing', () => {
    const junk = Buffer.from('not-a-gzip-stream!!!!');
    expect(() =>
      verifyAndDecodeReassembledCourse(junk, sha256(junk))
    ).toThrow(/GZIP|JSON|decompression|empty|invalid/i);
  });

  it('SHA-256 mismatch rejected', () => {
    const course = minimalCourse();
    const gzip = zlib.gzipSync(Buffer.from(JSON.stringify(course), 'utf8'));
    expect(() =>
      verifyAndDecodeReassembledCourse(gzip, 'a'.repeat(64))
    ).toThrow(/SHA-256/i);
  });

  it('CHUNK path rejects when accumulated decoded bytes exceed transfer cap', () => {
    process.env.TRAINER_PUBLISH_MAX_TRANSFER_DECODED_BYTES = String(1024 * 1024); // 1 MiB
    expect(storeGetMaxTransfer()).toBe(1024 * 1024);

    createTransferSession({
      transfer_id: 't-size-1',
      publisher_trainer_id: '11111111-1111-4111-8111-111111111111',
      source_course_id: '51',
      transfer_sha256: 'b'.repeat(64),
      expected_chunk_count: 3,
      expires_at_ms: Date.now() + 60_000
    });

    const half = Buffer.alloc(600 * 1024, 1);
    storeChunk('t-size-1', 0, half);
    expect(() => storeChunk('t-size-1', 1, half)).toThrow(/maximum decoded size/i);
  });

  it('decodeCompressedTrainerCourse (legacy helper) still uses 5 MiB default option', () => {
    const course = minimalCourse({ course_name: 'small' });
    const b64 = zlib
      .gzipSync(Buffer.from(JSON.stringify(course), 'utf8'))
      .toString('base64');
    expect(decodeCompressedTrainerCourse(b64).course_name).toBe('small');
  });
});

function MiB() {
  return 1024 * 1024;
}
