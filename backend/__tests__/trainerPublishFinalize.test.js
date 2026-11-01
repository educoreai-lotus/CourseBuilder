import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { generateSignature } from '../utils/signature.js';
import {
  TRAINER_PUBLISH_INIT_ACTION,
  TRAINER_PUBLISH_INIT_REQUESTER,
  TRAINER_PUBLISH_INIT_TARGET,
  signRoutingTicket
} from '../utils/trainerPublishInit.js';
import { TRAINER_PUBLISH_CHUNK_ACTION } from '../utils/trainerPublishChunk.js';
import {
  TRAINER_PUBLISH_FINALIZE_ACTION,
  isTrainerPublishFinalizeRequest,
  verifyAndDecodeReassembledCourse,
  normalizeAndBindTrainerCourse
} from '../utils/trainerPublishFinalize.js';
import { handleTrainerPublishInit } from '../services/trainerPublish/initService.js';
import { handleTrainerPublishChunk } from '../services/trainerPublish/chunkService.js';
import { handleTrainerPublishFinalize } from '../services/trainerPublish/finalizeService.js';
import {
  clearAllTransferSessions,
  getTransferSession,
  getTransferSessionCount,
  createTransferSession,
  storeChunk,
  reassembleTransferBytes
} from '../services/trainerPublish/transferMemoryStore.js';
import {
  buildPersistableCourseSnapshot,
  computeContentFingerprint,
  generateDeterministicCourseId,
  persistableContentMatches
} from '../services/trainerPublish/contentFingerprint.js';
import { publishTrainerCourseIdempotent } from '../services/trainerPublish/finalizePersist.js';
import {
  expandCompressedTrainerPublishIfNeeded,
  COMPRESSED_TRAINER_PUBLISH_ACTION,
  COMPRESSED_TRAINER_PUBLISH_REQUESTER,
  COMPRESSED_TRAINER_PUBLISH_TARGET,
  MAX_DECOMPRESSED_TRAINER_COURSE_BYTES
} from '../utils/compressedTrainerPublish.js';
import { normalizeContentStudioPayload } from '../services/contentStudioNormalizer.js';

const TRAINER_A = '11111111-1111-4111-8111-111111111111';
const TRAINER_B = '22222222-2222-4222-8222-222222222222';
const SOURCE_COURSE = 'cs-source-course-finalize-1';

function generateEcKeyPair() {
  return crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

function mockReq(headers = {}) {
  return { headers };
}

function buildTrainerCourse(overrides = {}) {
  return {
    trainer_id: TRAINER_A,
    trainer_name: 'Trainer A',
    course_id: SOURCE_COURSE,
    course_name: 'Finalize Course',
    course_description: 'Desc',
    course_language: 'en',
    topics: [
      {
        topic_name: 'Lesson Alpha',
        topic_description: 'A',
        contents: [
          {
            content_type: 'text_audio',
            html: '<p>Hello <strong>world</strong></p>',
            media: { url: 'https://cdn.example/a.mp3', type: 'audio' }
          },
          {
            content_type: 'code',
            code: 'console.log("hi")',
            language: 'javascript'
          }
        ],
        format_order: ['text_audio', 'code'],
        skills: ['js'],
        trainer_ids: [TRAINER_A],
        devlab_exercises: [{ id: 'ex1', title: 'Lab 1', prompt: 'Do X' }]
      },
      {
        topic_name: 'Lesson Beta',
        topic_description: 'B',
        contents: [{ content_type: 'text_audio', html: '<p>Beta</p>' }],
        format_order: ['text_audio'],
        skills: ['basics'],
        trainer_ids: [TRAINER_A],
        devlab_exercises: []
      }
    ],
    ...overrides
  };
}

function gzipCourse(course) {
  const json = JSON.stringify(course);
  return zlib.gzipSync(Buffer.from(json, 'utf8'));
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

describe('trainerPublishFinalize', () => {
  let coordinatorKeys;
  let courseBuilderKeys;

  beforeAll(() => {
    coordinatorKeys = generateEcKeyPair();
    courseBuilderKeys = generateEcKeyPair();
  });

  beforeEach(() => {
    clearAllTransferSessions();
  });

  function signCoord(envelope) {
    return generateSignature('coordinator', coordinatorKeys.privateKey, envelope);
  }

  function initDeps() {
    return {
      loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
      loadCourseBuilderPrivateKey: () => courseBuilderKeys.privateKey,
      // Live clock so ticket/session exp stays ahead of CHUNK/FINALIZE Date.now() checks
      now: () => new Date()
    };
  }

  function chunkDeps() {
    return {
      loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
      loadCourseBuilderPublicKey: () => courseBuilderKeys.publicKey
    };
  }

  function finalizeDeps(extra = {}) {
    return {
      loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
      loadCourseBuilderPublicKey: () => courseBuilderKeys.publicKey,
      ...extra
    };
  }

  async function seedTransfer(course = buildTrainerCourse(), chunkSizes = null) {
    const gzipBytes = gzipCourse(course);
    const transferSha = sha256(gzipBytes);

    let parts;
    if (chunkSizes) {
      parts = [];
      let offset = 0;
      for (const size of chunkSizes) {
        parts.push(gzipBytes.subarray(offset, offset + size));
        offset += size;
      }
      if (offset !== gzipBytes.length) {
        parts.push(gzipBytes.subarray(offset));
      }
    } else {
      const mid = Math.ceil(gzipBytes.length / 2);
      parts = [gzipBytes.subarray(0, mid), gzipBytes.subarray(mid)];
    }

    const payload = {
      action: TRAINER_PUBLISH_INIT_ACTION,
      targetService: TRAINER_PUBLISH_INIT_TARGET,
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE_COURSE,
      transfer_sha256: transferSha,
      expected_chunk_count: parts.length
    };
    const envelope = {
      requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
      payload,
      response: {}
    };
    const req = mockReq({
      'x-service-name': 'coordinator',
      'x-signature': signCoord(envelope)
    });
    const initResponse = await handleTrainerPublishInit(req, envelope, initDeps());

    // Store chunks out of order intentionally for some tests.
    for (let i = parts.length - 1; i >= 0; i--) {
      const chunkEnvelope = {
        requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
        payload: {
          action: TRAINER_PUBLISH_CHUNK_ACTION,
          targetService: TRAINER_PUBLISH_INIT_TARGET,
          routing_ticket: initResponse.routing_ticket,
          transfer_id: initResponse.transfer_id,
          transfer_sha256: transferSha,
          expected_chunk_count: parts.length,
          publisher_trainer_id: TRAINER_A,
          source_course_id: SOURCE_COURSE,
          chunk_index: i,
          chunk_data: Buffer.from(parts[i]).toString('base64')
        },
        response: {}
      };
      const chunkReq = mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(chunkEnvelope)
      });
      await handleTrainerPublishChunk(chunkReq, chunkEnvelope, chunkDeps());
    }

    return { initResponse, gzipBytes, transferSha, course, parts };
  }

  function buildFinalizeEnvelope(initResponse, extra = {}) {
    const claims = initResponse.routing_ticket.claims;
    return {
      requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
      payload: {
        action: TRAINER_PUBLISH_FINALIZE_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET,
        routing_ticket: initResponse.routing_ticket,
        transfer_id: initResponse.transfer_id,
        transfer_sha256: claims.transfer_sha256,
        expected_chunk_count: claims.expected_chunk_count,
        publisher_trainer_id: claims.publisher_trainer_id,
        source_course_id: claims.source_course_id,
        ...extra
      },
      response: {}
    };
  }

  function mockSuccessfulPublish(courseIdOverride = null) {
    return async ({ courseId, normalized, incomingSnapshot }) => {
      const expectedId =
        courseIdOverride ||
        generateDeterministicCourseId({
          publisher_trainer_id: TRAINER_A,
          source_course_id: SOURCE_COURSE,
          content_fingerprint: computeContentFingerprint(incomingSnapshot)
        });
      expect(courseId).toBe(expectedId);
      return {
        course_id: courseId,
        lessons_created: normalized.lessons.length,
        lessons_expected: normalized.lessons.length,
        idempotent: false
      };
    };
  }

  it('matches only exact FINALIZE identity', () => {
    expect(
      isTrainerPublishFinalizeRequest(TRAINER_PUBLISH_INIT_REQUESTER, {
        action: TRAINER_PUBLISH_FINALIZE_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET
      })
    ).toBe(true);
    expect(
      isTrainerPublishFinalizeRequest(TRAINER_PUBLISH_INIT_REQUESTER, {
        action: TRAINER_PUBLISH_CHUNK_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET
      })
    ).toBe(false);
  });

  it('completes successful finalize with out-of-order chunks', async () => {
    const { initResponse, course } = await seedTransfer();
    const envelope = buildFinalizeEnvelope(initResponse);
    const req = mockReq({
      'x-service-name': 'coordinator',
      'x-signature': signCoord(envelope)
    });

    const result = await handleTrainerPublishFinalize(
      req,
      envelope,
      finalizeDeps({ publishTrainerCourseIdempotent: mockSuccessfulPublish() })
    );

    expect(result.status).toBe('published');
    expect(result.transfer_id).toBe(initResponse.transfer_id);
    expect(result.source_course_id).toBe(SOURCE_COURSE);
    expect(result.lessons_created).toBe(2);
    expect(result.lessons_expected).toBe(2);
    expect(result.content_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.course_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    // Memory cleaned after success
    expect(getTransferSession(initResponse.transfer_id)).toBeNull();

    // HTML / code / media / DevLab preserved in fingerprint inputs
    const normalized = normalizeContentStudioPayload(course);
    expect(normalized.lessons[0].content_data[0].html).toContain('<strong>');
    expect(normalized.lessons[0].content_data[1].code).toContain('console.log');
    expect(normalized.lessons[0].devlab_exercises[0].id).toBe('ex1');
    expect(normalized.lessons[0].format_order).toEqual(['text_audio', 'code']);
  });

  it('rejects missing chunks', async () => {
    const course = buildTrainerCourse();
    const gzipBytes = gzipCourse(course);
    const transferSha = sha256(gzipBytes);
    const mid = Math.ceil(gzipBytes.length / 2);
    const parts = [gzipBytes.subarray(0, mid), gzipBytes.subarray(mid)];

    const payload = {
      action: TRAINER_PUBLISH_INIT_ACTION,
      targetService: TRAINER_PUBLISH_INIT_TARGET,
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE_COURSE,
      transfer_sha256: transferSha,
      expected_chunk_count: 2
    };
    const initEnv = {
      requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
      payload,
      response: {}
    };
    const initResponse = await handleTrainerPublishInit(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(initEnv)
      }),
      initEnv,
      initDeps()
    );

    // Only store index 0
    storeChunk(initResponse.transfer_id, 0, Buffer.from(parts[0]));

    const envelope = buildFinalizeEnvelope(initResponse);
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        finalizeDeps({ publishTrainerCourseIdempotent: mockSuccessfulPublish() })
      )
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/missing/i) });

    // Session retained after recoverable failure
    expect(getTransferSession(initResponse.transfer_id)).not.toBeNull();
  });

  it('rejects incorrect full-transfer SHA-256', async () => {
    const { initResponse } = await seedTransfer();
    // Corrupt stored bytes while keeping ticket sha
    const session = getTransferSession(initResponse.transfer_id);
    session.chunks.set(0, Buffer.from('not-gzip-bytes!!!!'));

    const envelope = buildFinalizeEnvelope(initResponse);
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        finalizeDeps({ publishTrainerCourseIdempotent: mockSuccessfulPublish() })
      )
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/SHA-256/i) });
  });

  it('rejects malformed GZIP/JSON', async () => {
    const junk = Buffer.from('not-a-gzip-payload');
    const transferSha = sha256(junk);
    createTransferSession({
      transfer_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE_COURSE,
      transfer_sha256: transferSha,
      expected_chunk_count: 1,
      expires_at_ms: Date.now() + 60_000
    });
    storeChunk('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', 0, junk);

    const claims = {
      transfer_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      iss: 'course-builder-service',
      aud: 'coordinator',
      requester: 'content-studio',
      dest: 'course-builder-service',
      ops: ['chunk', 'finalize'],
      exp: Math.floor(Date.now() / 1000) + 3600,
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE_COURSE,
      transfer_sha256: transferSha,
      expected_chunk_count: 1
    };
    const ticket = signRoutingTicket(claims, courseBuilderKeys.privateKey);
    const envelope = {
      requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
      payload: {
        action: TRAINER_PUBLISH_FINALIZE_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET,
        routing_ticket: ticket,
        transfer_id: claims.transfer_id,
        transfer_sha256: transferSha,
        expected_chunk_count: 1,
        publisher_trainer_id: TRAINER_A,
        source_course_id: SOURCE_COURSE
      },
      response: {}
    };
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        finalizeDeps({ publishTrainerCourseIdempotent: mockSuccessfulPublish() })
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects oversized decompression', () => {
    // Craft a small gzip that expands large — use maxOutputLength path via verify helper
    const huge = Buffer.alloc(MAX_DECOMPRESSED_TRAINER_COURSE_BYTES + 1024, 0x61);
    const compressed = zlib.gzipSync(huge);
    const transferSha = sha256(compressed);
    expect(() =>
      verifyAndDecodeReassembledCourse(compressed, transferSha)
    ).toThrow(/maximum decompressed size/i);
  });

  it('rejects missing Coordinator signature', async () => {
    const { initResponse } = await seedTransfer();
    const envelope = buildFinalizeEnvelope(initResponse);
    await expect(
      handleTrainerPublishFinalize(
        mockReq({ 'x-service-name': 'coordinator' }),
        envelope,
        finalizeDeps({ publishTrainerCourseIdempotent: mockSuccessfulPublish() })
      )
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects invalid Coordinator signature', async () => {
    const { initResponse } = await seedTransfer();
    const envelope = buildFinalizeEnvelope(initResponse);
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': 'deadbeef'
        }),
        envelope,
        finalizeDeps({ publishTrainerCourseIdempotent: mockSuccessfulPublish() })
      )
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects expired ticket', async () => {
    const { initResponse } = await seedTransfer();
    const expiredClaims = {
      ...initResponse.routing_ticket.claims,
      exp: Math.floor(Date.now() / 1000) - 30
    };
    const expiredTicket = signRoutingTicket(
      expiredClaims,
      courseBuilderKeys.privateKey
    );
    const envelope = buildFinalizeEnvelope(initResponse, {
      routing_ticket: expiredTicket
    });
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        finalizeDeps({ publishTrainerCourseIdempotent: mockSuccessfulPublish() })
      )
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects publisher / source metadata mismatch', async () => {
    const { initResponse } = await seedTransfer();
    const envelope = buildFinalizeEnvelope(initResponse, {
      publisher_trainer_id: TRAINER_B
    });
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        finalizeDeps({ publishTrainerCourseIdempotent: mockSuccessfulPublish() })
      )
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects missing memory session', async () => {
    const { initResponse } = await seedTransfer();
    clearAllTransferSessions();
    const envelope = buildFinalizeEnvelope(initResponse);
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        finalizeDeps({ publishTrainerCourseIdempotent: mockSuccessfulPublish() })
      )
    ).rejects.toMatchObject({ status: 410 });
  });

  it('rejects publisher isolation when course trainer_id differs', async () => {
    const course = buildTrainerCourse({ trainer_id: TRAINER_B });
    // INIT still uses TRAINER_A — gzip content has TRAINER_B
    const gzipBytes = gzipCourse(course);
    const transferSha = sha256(gzipBytes);
    const payload = {
      action: TRAINER_PUBLISH_INIT_ACTION,
      targetService: TRAINER_PUBLISH_INIT_TARGET,
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE_COURSE,
      transfer_sha256: transferSha,
      expected_chunk_count: 1
    };
    const initEnv = {
      requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
      payload,
      response: {}
    };
    const initResponse = await handleTrainerPublishInit(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(initEnv)
      }),
      initEnv,
      initDeps()
    );
    storeChunk(initResponse.transfer_id, 0, gzipBytes);

    const envelope = buildFinalizeEnvelope(initResponse);
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        finalizeDeps({ publishTrainerCourseIdempotent: mockSuccessfulPublish() })
      )
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/trainer_id/i)
    });
  });

  it('successful database transaction path via mock tx', async () => {
    const { initResponse, course } = await seedTransfer();
    const created = [];
    let persistedOrder = null;
    const mockDb = {
      tx: async (fn) => {
        const t = {
          __tx: true,
          none: async (_sql, params) => {
            persistedOrder = JSON.parse(params[1]).trainer_publish_lesson_order;
          },
          oneOrNone: async () => ({ ord: persistedOrder })
        };
        return fn(t);
      }
    };
    const mockRepos = {
      courseRepository: {
        findById: async () => null,
        create: async (data, ctx) => {
          expect(ctx.__tx).toBe(true);
          created.push(['course', data.id]);
          return { id: data.id, ...data };
        }
      },
      topicRepository: {
        create: async (data, ctx) => {
          expect(ctx.__tx).toBe(true);
          created.push(['topic', data.topic_name]);
          return { id: 'topic-1', ...data };
        }
      },
      moduleRepository: {
        create: async (data, ctx) => {
          expect(ctx.__tx).toBe(true);
          created.push(['module', data.module_name]);
          return { id: 'module-1', ...data };
        }
      },
      lessonRepository: {
        create: async (data, ctx) => {
          expect(ctx.__tx).toBe(true);
          created.push(['lesson', data.lesson_name]);
          expect(data.format_order).toBeDefined();
          expect(Array.isArray(data.content_data)).toBe(true);
          return { id: `lesson-${created.length}`, ...data };
        }
      }
    };

    const envelope = buildFinalizeEnvelope(initResponse);
    const result = await handleTrainerPublishFinalize(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(envelope)
      }),
      envelope,
      finalizeDeps({
        publishTrainerCourseIdempotent: (args) =>
          publishTrainerCourseIdempotent({
            ...args,
            deps: { db: mockDb, ...mockRepos }
          })
      })
    );

    expect(result.status).toBe('published');
    expect(created.filter((c) => c[0] === 'lesson')).toHaveLength(
      course.topics.length
    );
    expect(created[0][0]).toBe('course');
    expect(persistedOrder).toHaveLength(course.topics.length);
  });

  it('rolls back when lesson creation fails halfway', async () => {
    const { initResponse } = await seedTransfer();
    let lessonAttempts = 0;
    const mockDb = {
      tx: async (fn) =>
        fn({
          __tx: true,
          none: async () => {},
          oneOrNone: async () => ({ ord: [] })
        })
    };
    const mockRepos = {
      courseRepository: {
        findById: async () => null,
        create: async (data) => ({ id: data.id, ...data })
      },
      topicRepository: {
        create: async (data) => ({ id: 't1', ...data })
      },
      moduleRepository: {
        create: async (data) => ({ id: 'm1', ...data })
      },
      lessonRepository: {
        create: async () => {
          lessonAttempts += 1;
          if (lessonAttempts === 2) {
            const err = new Error('simulated lesson failure');
            throw err;
          }
          return { id: 'l1' };
        }
      }
    };

    const envelope = buildFinalizeEnvelope(initResponse);
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        finalizeDeps({
          publishTrainerCourseIdempotent: (args) =>
            publishTrainerCourseIdempotent({
              ...args,
              deps: { db: mockDb, ...mockRepos }
            })
        })
      )
    ).rejects.toThrow(/simulated lesson failure/);

    // Transfer retained for retry
    expect(getTransferSession(initResponse.transfer_id)).not.toBeNull();
  });

  it('duplicate FINALIZE / lost ACK returns existing course without re-insert', async () => {
    const { initResponse, course } = await seedTransfer();
    const normalized = normalizeContentStudioPayload({
      ...course,
      trainer_id: TRAINER_A
    });
    const snapshot = buildPersistableCourseSnapshot({
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A,
      lessons: normalized.lessons
    });
    const fp = computeContentFingerprint(snapshot);
    const courseId = generateDeterministicCourseId({
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE_COURSE,
      content_fingerprint: fp
    });

    let createCalls = 0;
    const existingCourse = {
      id: courseId,
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A
    };

    const envelope = buildFinalizeEnvelope(initResponse);
    const result = await handleTrainerPublishFinalize(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(envelope)
      }),
      envelope,
      finalizeDeps({
        publishTrainerCourseIdempotent: (args) =>
          publishTrainerCourseIdempotent({
            ...args,
            deps: {
              courseRepository: {
                findById: async () => existingCourse,
                create: async () => {
                  createCalls += 1;
                  throw new Error('should not create');
                }
              },
              buildPersistedSnapshot: async () => snapshot
            }
          })
      })
    );

    expect(result.status).toBe('published');
    expect(result.course_id).toBe(courseId);
    expect(result.lessons_created).toBe(2);
    expect(createCalls).toBe(0);
    expect(getTransferSession(initResponse.transfer_id)).toBeNull();
  });

  it('concurrent FINALIZE PK conflict resolves via content match', async () => {
    const { initResponse, course } = await seedTransfer();
    const normalized = normalizeContentStudioPayload({
      ...course,
      trainer_id: TRAINER_A
    });
    const snapshot = buildPersistableCourseSnapshot({
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A,
      lessons: normalized.lessons
    });
    const fp = computeContentFingerprint(snapshot);
    const courseId = generateDeterministicCourseId({
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE_COURSE,
      content_fingerprint: fp
    });

    const existingCourse = {
      id: courseId,
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A
    };

    let findCalls = 0;
    // Idempotent path never enters insert; stub tx context for safety.
    const mockDb = {
      tx: async (fn) =>
        fn({
          __tx: true,
          none: async () => {},
          oneOrNone: async () => ({ ord: [] })
        })
    };

    const envelope = buildFinalizeEnvelope(initResponse);
    const result = await handleTrainerPublishFinalize(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(envelope)
      }),
      envelope,
      finalizeDeps({
        publishTrainerCourseIdempotent: (args) =>
          publishTrainerCourseIdempotent({
            ...args,
            deps: {
              db: mockDb,
              courseRepository: {
                findById: async () => {
                  findCalls += 1;
                  // First outer check: absent; inside tx create throws 23505; then reload
                  if (findCalls === 1) return null;
                  if (findCalls === 2) return null; // inside tx before create
                  return existingCourse;
                },
                create: async () => {
                  const err = new Error('duplicate key');
                  err.code = '23505';
                  throw err;
                }
              },
              topicRepository: { create: async () => ({ id: 't' }) },
              moduleRepository: { create: async () => ({ id: 'm' }) },
              lessonRepository: { create: async () => ({ id: 'l' }) },
              buildPersistedSnapshot: async () => snapshot
            }
          })
      })
    );

    expect(result.status).toBe('published');
    expect(result.course_id).toBe(courseId);
  });

  it('same course identity with different content returns 409', async () => {
    const { initResponse, course } = await seedTransfer();
    const normalized = normalizeContentStudioPayload({
      ...course,
      trainer_id: TRAINER_A
    });
    const snapshot = buildPersistableCourseSnapshot({
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A,
      lessons: normalized.lessons
    });
    const fp = computeContentFingerprint(snapshot);
    const courseId = generateDeterministicCourseId({
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE_COURSE,
      content_fingerprint: fp
    });

    // Different persisted content (altered lesson html)
    const differentSnapshot = buildPersistableCourseSnapshot({
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A,
      lessons: normalized.lessons.map((l, i) =>
        i === 0
          ? {
              ...l,
              content_data: [{ content_type: 'text_audio', html: '<p>CHANGED</p>' }]
            }
          : l
      )
    });

    const envelope = buildFinalizeEnvelope(initResponse);
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        finalizeDeps({
          publishTrainerCourseIdempotent: (args) =>
            publishTrainerCourseIdempotent({
              ...args,
              deps: {
                courseRepository: {
                  findById: async () => ({
                    id: courseId,
                    course_name: normalized.course_name,
                    course_description: normalized.course_description,
                    created_by_user_id: TRAINER_A
                  }),
                  create: async () => {
                    throw new Error('should not create');
                  }
                },
                buildPersistedSnapshot: async () => differentSnapshot
              }
            })
        })
      )
    ).rejects.toMatchObject({ status: 409 });

    expect(getTransferSession(initResponse.transfer_id)).not.toBeNull();
  });

  it('order-independent lesson fingerprint match still succeeds', () => {
    const lessonsA = [
      {
        lesson_name: 'B',
        lesson_description: null,
        content_type: 'mixed',
        content_data: [{ x: 1 }],
        devlab_exercises: [],
        skills: [],
        trainer_ids: [TRAINER_A],
        format_order: []
      },
      {
        lesson_name: 'A',
        lesson_description: null,
        content_type: 'mixed',
        content_data: [{ y: 2 }],
        devlab_exercises: [],
        skills: [],
        trainer_ids: [TRAINER_A],
        format_order: ['text_audio']
      }
    ];
    const snap1 = buildPersistableCourseSnapshot({
      course_name: 'C',
      course_description: null,
      created_by_user_id: TRAINER_A,
      lessons: lessonsA
    });
    const snap2 = buildPersistableCourseSnapshot({
      course_name: 'C',
      course_description: null,
      created_by_user_id: TRAINER_A,
      lessons: [lessonsA[1], lessonsA[0]]
    });
    expect(persistableContentMatches(snap1, snap2)).toBe(true);
  });

  it('reassembleTransferBytes concatenates in index order', () => {
    createTransferSession({
      transfer_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE_COURSE,
      transfer_sha256: 'c'.repeat(64),
      expected_chunk_count: 3,
      expires_at_ms: Date.now() + 60_000
    });
    storeChunk('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 2, Buffer.from('C'));
    storeChunk('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 0, Buffer.from('A'));
    storeChunk('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, Buffer.from('B'));
    expect(
      reassembleTransferBytes('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb').toString()
    ).toBe('ABC');
  });

  it('controller source order: INIT then CHUNK then FINALIZE before compress', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const src = fs.readFileSync(
      path.join(__dirname, '../controllers/integration.controller.js'),
      'utf8'
    );
    const initIdx = src.indexOf('isTrainerPublishInitRequest(');
    const chunkIdx = src.indexOf('isTrainerPublishChunkRequest(');
    const finalizeIdx = src.indexOf('isTrainerPublishFinalizeRequest(');
    const expandIdx = src.indexOf('expandCompressedTrainerPublishIfNeeded(');
    const targetAssignIdx = src.indexOf('targetService = determineTargetService(');
    expect(initIdx).toBeGreaterThan(-1);
    expect(chunkIdx).toBeGreaterThan(initIdx);
    expect(finalizeIdx).toBeGreaterThan(chunkIdx);
    expect(expandIdx).toBeGreaterThan(finalizeIdx);
    expect(targetAssignIdx).toBeGreaterThan(expandIdx);
  });

  it('legacy compressed Trainer Publish expand unchanged', () => {
    const course = buildTrainerCourse();
    const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(course))).toString(
      'base64'
    );
    const payload = {
      action: COMPRESSED_TRAINER_PUBLISH_ACTION,
      targetService: COMPRESSED_TRAINER_PUBLISH_TARGET,
      course_encoding: 'gzip+base64',
      course_compressed: compressed
    };
    expect(
      isTrainerPublishFinalizeRequest(COMPRESSED_TRAINER_PUBLISH_REQUESTER, payload)
    ).toBe(false);
    const expanded = expandCompressedTrainerPublishIfNeeded(
      COMPRESSED_TRAINER_PUBLISH_REQUESTER,
      payload
    );
    expect(expanded.course_name).toBe('Finalize Course');
    expect(expanded.topics).toHaveLength(2);
  });

  it('INIT remains functional alongside FINALIZE gates', async () => {
    const { initResponse } = await seedTransfer();
    expect(initResponse.status).toBe('initialized');
    expect(initResponse.routing_ticket.claims.ops).toEqual(['chunk', 'finalize']);
    expect(getTransferSessionCount()).toBe(1);
  });

  it('does not invoke schema migrations (no SQL DDL in finalize modules)', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const files = [
      '../services/trainerPublish/finalizeService.js',
      '../services/trainerPublish/finalizePersist.js',
      '../services/trainerPublish/contentFingerprint.js',
      '../utils/trainerPublishFinalize.js'
    ];
    for (const rel of files) {
      const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
      expect(src).not.toMatch(/CREATE TABLE|ALTER TABLE|CREATE INDEX/i);
    }
  });

  it('normalizeAndBind rejects source_course_id mismatch', () => {
    const course = buildTrainerCourse({ course_id: 'other-id' });
    expect(() =>
      normalizeAndBindTrainerCourse(course, {
        publisher_trainer_id: TRAINER_A,
        source_course_id: SOURCE_COURSE
      })
    ).toThrow(/source_course_id/);
  });
});
