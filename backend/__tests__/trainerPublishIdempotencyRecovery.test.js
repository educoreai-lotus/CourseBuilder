/**
 * PHASE 6F — Transactional idempotency & lost-ack recovery verification.
 *
 * ENVIRONMENT: No local PostgreSQL was reachable on course_builder_test (port 5432 closed;
 * no .env.test). Per Phase 6F rules, these tests use CLEARLY LABELED MOCKS only and do
 * NOT write to any shared/production database.
 *
 * They prove application-level recovery/idempotency contracts. They do NOT prove
 * real pg-promise rollback against a live PostgreSQL engine.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { generateSignature } from '../utils/signature.js';
import {
  TRAINER_PUBLISH_INIT_ACTION,
  TRAINER_PUBLISH_INIT_REQUESTER,
  TRAINER_PUBLISH_INIT_TARGET
} from '../utils/trainerPublishInit.js';
import { TRAINER_PUBLISH_CHUNK_ACTION } from '../utils/trainerPublishChunk.js';
import { TRAINER_PUBLISH_FINALIZE_ACTION } from '../utils/trainerPublishFinalize.js';
import { TRAINER_PUBLISH_ERROR_CODES } from '../utils/trainerPublishErrors.js';
import { handleTrainerPublishInit } from '../services/trainerPublish/initService.js';
import { handleTrainerPublishChunk } from '../services/trainerPublish/chunkService.js';
import { handleTrainerPublishFinalize } from '../services/trainerPublish/finalizeService.js';
import {
  clearAllTransferSessions,
  getTransferSession,
  MAX_CHUNK_BASE64_CHARS,
  MAX_MEMORY_CHUNK_COUNT,
  MAX_TRANSFER_DECODED_BYTES
} from '../services/trainerPublish/transferMemoryStore.js';
import {
  buildPersistableCourseSnapshot,
  computeContentFingerprint,
  generateDeterministicCourseId,
  persistableContentMatches
} from '../services/trainerPublish/contentFingerprint.js';
import { publishTrainerCourseIdempotent } from '../services/trainerPublish/finalizePersist.js';
import { normalizeContentStudioPayload } from '../services/contentStudioNormalizer.js';
import { MAX_DECOMPRESSED_TRAINER_COURSE_BYTES } from '../utils/compressedTrainerPublish.js';

const TRAINER_A = '11111111-1111-4111-8111-111111111111';
const SOURCE = 'cs-idempotency-source-6f';

/** Approx max decoded bytes for one chunk given Base64 char cap. */
const MAX_CHUNK_DECODED_BYTES = Math.floor((MAX_CHUNK_BASE64_CHARS * 3) / 4);

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

function buildRichCourse(lessonCount = 2, overrides = {}) {
  const topics = [];
  for (let i = 0; i < lessonCount; i++) {
    topics.push({
      topic_name: `Lesson ${String(i + 1).padStart(3, '0')}`,
      topic_description: `Description ${i + 1}`,
      contents: [
        {
          content_type: 'text_audio',
          html: `<p>Paragraph <strong>${i}</strong> with <em>markup</em></p>`,
          media: { url: `https://cdn.example/audio/${i}.mp3`, type: 'audio', duration_ms: 1000 + i }
        },
        {
          content_type: 'code',
          code: `console.log("lesson-${i}");\nconst x = [${i}, ${i + 1}];`,
          language: 'javascript'
        }
      ],
      format_order: ['text_audio', 'code', 'avatar_video'],
      skills: [`skill-${i % 5}`, 'shared-skill'],
      trainer_ids: [TRAINER_A],
      devlab_exercises: [
        {
          id: `ex-${i}`,
          title: `Lab ${i}`,
          prompt: `Do step A then B for ${i}`,
          steps: ['A', 'B', 'C']
        }
      ]
    });
  }
  return {
    trainer_id: TRAINER_A,
    trainer_name: 'Trainer A',
    course_id: SOURCE,
    course_name: 'Idempotency Course',
    course_description: 'Canonical content fixture',
    course_language: 'en',
    topics,
    ...overrides
  };
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function expectedChunkCount(gzipBytes) {
  return Math.max(1, Math.ceil(gzipBytes.length / MAX_CHUNK_DECODED_BYTES));
}

function measureCourse(lessonCount) {
  const course = buildRichCourse(lessonCount);
  const json = JSON.stringify(course);
  const jsonUtf8 = Buffer.byteLength(json, 'utf8');
  const gzipBytes = zlib.gzipSync(Buffer.from(json, 'utf8'));
  const chunks = expectedChunkCount(gzipBytes);
  return {
    lessons: lessonCount,
    json_utf8_bytes: jsonUtf8,
    gzip_bytes: gzipBytes.length,
    expected_chunk_count: chunks,
    fits_5mib_decompress: jsonUtf8 <= MAX_DECOMPRESSED_TRAINER_COURSE_BYTES,
    fits_8mib_compressed: gzipBytes.length <= MAX_TRANSFER_DECODED_BYTES,
    fits_512_chunks: chunks <= MAX_MEMORY_CHUNK_COUNT,
    // Synthetic only — not production content sizes.
    synthetic: true
  };
}

describe('Phase 6F idempotency & lost-ack (MOCKED — no live PostgreSQL)', () => {
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

  function authDeps() {
    return {
      loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
      loadCourseBuilderPublicKey: () => courseBuilderKeys.publicKey
    };
  }

  async function runInitForGzip(gzipBytes, sourceCourseId = SOURCE) {
    const transferSha = sha256(gzipBytes);
    const mid = Math.ceil(gzipBytes.length / 2);
    const parts = [gzipBytes.subarray(0, mid), gzipBytes.subarray(mid)].filter(
      (p) => p.length > 0
    );
    const payload = {
      action: TRAINER_PUBLISH_INIT_ACTION,
      targetService: TRAINER_PUBLISH_INIT_TARGET,
      publisher_trainer_id: TRAINER_A,
      source_course_id: sourceCourseId,
      transfer_sha256: transferSha,
      expected_chunk_count: parts.length
    };
    const envelope = {
      requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
      payload,
      response: {}
    };
    const initResponse = await handleTrainerPublishInit(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(envelope)
      }),
      envelope,
      initDeps()
    );
    return { initResponse, parts, transferSha };
  }

  async function sendAllChunks(initResponse, parts, transferSha, sourceCourseId = SOURCE) {
    for (let i = 0; i < parts.length; i++) {
      const envelope = {
        requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
        payload: {
          action: TRAINER_PUBLISH_CHUNK_ACTION,
          targetService: TRAINER_PUBLISH_INIT_TARGET,
          routing_ticket: initResponse.routing_ticket,
          transfer_id: initResponse.transfer_id,
          transfer_sha256: transferSha,
          expected_chunk_count: parts.length,
          publisher_trainer_id: TRAINER_A,
          source_course_id: sourceCourseId,
          chunk_index: i,
          chunk_data: Buffer.from(parts[i]).toString('base64')
        },
        response: {}
      };
      await handleTrainerPublishChunk(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        authDeps()
      );
    }
  }

  function buildFinalizeEnvelope(initResponse, transferSha, sourceCourseId = SOURCE) {
    return {
      requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
      payload: {
        action: TRAINER_PUBLISH_FINALIZE_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET,
        routing_ticket: initResponse.routing_ticket,
        transfer_id: initResponse.transfer_id,
        transfer_sha256: transferSha,
        expected_chunk_count: initResponse.routing_ticket.claims.expected_chunk_count,
        publisher_trainer_id: TRAINER_A,
        source_course_id: sourceCourseId
      },
      response: {}
    };
  }

  /**
   * MOCKED in-memory "database" that records creates for duplicate detection.
   */
  function createMockDbWorld() {
    const courses = new Map();
    const topicsByCourse = new Map();
    const modulesByTopic = new Map();
    const lessonsByCourse = new Map();
    let createCourseCalls = 0;
    let createTopicCalls = 0;
    let createModuleCalls = 0;
    let createLessonCalls = 0;
    let failAt = null; // 'course' | 'topic' | 'module' | 'lesson:N'

    const mockDb = {
      tx: async (fn) => {
        // Simulate transactional isolation with staged writes + rollback.
        const staging = {
          course: null,
          topic: null,
          module: null,
          lessons: []
        };
        const t = {
          __tx: true,
          _staging: staging,
          none: async (_sql, params) => {
            const patch = JSON.parse(params[1]);
            staging.course = {
              ...(staging.course || {}),
              learning_path_designation: {
                ...((staging.course && staging.course.learning_path_designation) || {}),
                ...patch
              }
            };
          },
          oneOrNone: async () => ({
            ord:
              staging.course?.learning_path_designation?.trainer_publish_lesson_order ||
              null
          })
        };
        try {
          const result = await fn(t);
          // commit
          if (staging.course) {
            courses.set(staging.course.id, staging.course);
            topicsByCourse.set(staging.course.id, staging.topic ? [staging.topic] : []);
            if (staging.module) {
              modulesByTopic.set(staging.topic.id, [staging.module]);
            }
            lessonsByCourse.set(
              staging.course.id,
              staging.lessons.map((l) => ({ ...l }))
            );
          }
          return result;
        } catch (err) {
          // rollback — discard staging
          return Promise.reject(err);
        }
      }
    };

    const courseRepository = {
      findById: async (id) => courses.get(id) || null,
      create: async (data, ctx) => {
        createCourseCalls += 1;
        if (failAt === 'course') {
          throw new Error('MOCK_FAIL_COURSE');
        }
        if (courses.has(data.id)) {
          const e = new Error('duplicate key');
          e.code = '23505';
          throw e;
        }
        const row = {
          id: data.id,
          course_name: data.course_name,
          course_description: data.course_description,
          created_by_user_id: data.created_by_user_id,
          status: data.status
        };
        if (ctx?.__tx) {
          ctx._staging.course = row;
        } else {
          courses.set(row.id, row);
        }
        return row;
      }
    };

    const topicRepository = {
      create: async (data, ctx) => {
        createTopicCalls += 1;
        if (failAt === 'topic') {
          throw new Error('MOCK_FAIL_TOPIC');
        }
        const row = {
          id: `topic-${createTopicCalls}`,
          course_id: data.course_id,
          topic_name: data.topic_name,
          topic_description: data.topic_description
        };
        if (ctx?.__tx) ctx._staging.topic = row;
        return row;
      }
    };

    const moduleRepository = {
      create: async (data, ctx) => {
        createModuleCalls += 1;
        if (failAt === 'module') {
          throw new Error('MOCK_FAIL_MODULE');
        }
        const row = {
          id: `module-${createModuleCalls}`,
          topic_id: data.topic_id,
          module_name: data.module_name
        };
        if (ctx?.__tx) ctx._staging.module = row;
        return row;
      }
    };

    const lessonRepository = {
      create: async (data, ctx) => {
        createLessonCalls += 1;
        if (failAt === `lesson:${createLessonCalls}`) {
          throw new Error('MOCK_FAIL_LESSON');
        }
        const row = {
          id: `lesson-${createLessonCalls}`,
          ...data
        };
        if (ctx?.__tx) ctx._staging.lessons.push(row);
        return row;
      }
    };

    async function buildPersistedSnapshot(course) {
      const lessons = lessonsByCourse.get(course.id) || [];
      return buildPersistableCourseSnapshot({
        course_name: course.course_name,
        course_description: course.course_description,
        created_by_user_id: course.created_by_user_id,
        lessons: lessons.map((l) => ({
          lesson_name: l.lesson_name,
          lesson_description: l.lesson_description,
          content_type: l.content_type,
          content_data: l.content_data,
          devlab_exercises: l.devlab_exercises,
          skills: l.skills,
          trainer_ids: l.trainer_ids,
          format_order: l.format_order
        }))
      });
    }

    return {
      mockDb,
      courseRepository,
      topicRepository,
      moduleRepository,
      lessonRepository,
      buildPersistedSnapshot,
      setFailAt: (v) => {
        failAt = v;
      },
      stats: () => ({
        createCourseCalls,
        createTopicCalls,
        createModuleCalls,
        createLessonCalls,
        courseCount: courses.size,
        lessonCount: [...lessonsByCourse.values()].reduce((n, a) => n + a.length, 0),
        topicCount: [...topicsByCourse.values()].reduce((n, a) => n + a.length, 0),
        moduleCount: [...modulesByTopic.values()].reduce((n, a) => n + a.length, 0)
      }),
      getCourse: (id) => courses.get(id),
      getLessons: (id) => lessonsByCourse.get(id) || []
    };
  }

  function persistDepsFromWorld(world) {
    return {
      db: world.mockDb,
      courseRepository: world.courseRepository,
      topicRepository: world.topicRepository,
      moduleRepository: world.moduleRepository,
      lessonRepository: world.lessonRepository,
      buildPersistedSnapshot: world.buildPersistedSnapshot
    };
  }

  it('[MOCKED] lost FINALIZE ack → session gone → full resend → same course UUID, no duplicate records', async () => {
    const course = buildRichCourse(2);
    const jsonBuf = Buffer.from(JSON.stringify(course), 'utf8');
    const gzipBytes = zlib.gzipSync(jsonBuf, { level: 6 });
    const world = createMockDbWorld();

    // --- First successful publish ---
    const first = await runInitForGzip(gzipBytes);
    await sendAllChunks(first.initResponse, first.parts, first.transferSha);
    expect(getTransferSession(first.initResponse.transfer_id)).not.toBeNull();

    const fin1 = buildFinalizeEnvelope(first.initResponse, first.transferSha);
    const result1 = await handleTrainerPublishFinalize(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(fin1)
      }),
      fin1,
      {
        ...authDeps(),
        publishTrainerCourseIdempotent: (args) =>
          publishTrainerCourseIdempotent({
            ...args,
            deps: persistDepsFromWorld(world)
          })
      }
    );

    expect(result1.status).toBe('published');
    expect(result1.lessons_created).toBe(2);
    expect(getTransferSession(first.initResponse.transfer_id)).toBeNull(); // ack would be lost after this
    const statsAfterFirst = world.stats();
    expect(statsAfterFirst.courseCount).toBe(1);
    expect(statsAfterFirst.topicCount).toBe(1);
    expect(statsAfterFirst.moduleCount).toBe(1);
    expect(statsAfterFirst.lessonCount).toBe(2);

    // --- Simulate lost ack: CS did not receive result1; memory already cleared ---
    expect(getTransferSession(first.initResponse.transfer_id)).toBeNull();

    // Lone FINALIZE retry without memory must fail closed (restart required)
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(fin1)
        }),
        fin1,
        authDeps()
      )
    ).rejects.toMatchObject({
      status: 410,
      error_code: TRAINER_PUBLISH_ERROR_CODES.TRANSFER_SESSION_GONE
    });

    // --- Full resend: fresh INIT + all chunks + FINALIZE ---
    const second = await runInitForGzip(gzipBytes);
    expect(second.initResponse.transfer_id).toBe(first.initResponse.transfer_id); // same transport identity
    await sendAllChunks(second.initResponse, second.parts, second.transferSha);

    const fin2 = buildFinalizeEnvelope(second.initResponse, second.transferSha);
    const result2 = await handleTrainerPublishFinalize(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(fin2)
      }),
      fin2,
      {
        ...authDeps(),
        publishTrainerCourseIdempotent: (args) =>
          publishTrainerCourseIdempotent({
            ...args,
            deps: persistDepsFromWorld(world)
          })
      }
    );

    expect(result2.status).toBe('published');
    expect(result2.course_id).toBe(result1.course_id);
    expect(result2.content_fingerprint).toBe(result1.content_fingerprint);

    const statsAfterSecond = world.stats();
    expect(statsAfterSecond.courseCount).toBe(1);
    expect(statsAfterSecond.topicCount).toBe(1);
    expect(statsAfterSecond.moduleCount).toBe(1);
    expect(statsAfterSecond.lessonCount).toBe(2);
    // No additional creates on idempotent path
    expect(statsAfterSecond.createCourseCalls).toBe(statsAfterFirst.createCourseCalls);
    expect(statsAfterSecond.createLessonCalls).toBe(statsAfterFirst.createLessonCalls);
  });

  it('[MOCKED] different gzip bytes, same persistable content → same course UUID', async () => {
    const course = buildRichCourse(2);
    const jsonBuf = Buffer.from(JSON.stringify(course), 'utf8');
    const gzipA = zlib.gzipSync(jsonBuf, { level: 1 });
    const gzipB = zlib.gzipSync(jsonBuf, { level: 9 });
    expect(sha256(gzipA)).not.toBe(sha256(gzipB)); // transport hashes differ

    const normalized = normalizeContentStudioPayload({
      ...course,
      trainer_id: TRAINER_A
    });
    const snap = buildPersistableCourseSnapshot({
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A,
      lessons: normalized.lessons
    });
    const fp = computeContentFingerprint(snap);
    const idA = generateDeterministicCourseId({
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE,
      content_fingerprint: fp
    });

    const world = createMockDbWorld();

    const first = await runInitForGzip(gzipA);
    await sendAllChunks(first.initResponse, first.parts, first.transferSha);
    const fin1 = buildFinalizeEnvelope(first.initResponse, first.transferSha);
    const r1 = await handleTrainerPublishFinalize(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(fin1)
      }),
      fin1,
      {
        ...authDeps(),
        publishTrainerCourseIdempotent: (args) =>
          publishTrainerCourseIdempotent({
            ...args,
            deps: persistDepsFromWorld(world)
          })
      }
    );
    expect(r1.course_id).toBe(idA);

    const second = await runInitForGzip(gzipB);
    expect(second.initResponse.transfer_id).not.toBe(first.initResponse.transfer_id);
    await sendAllChunks(second.initResponse, second.parts, second.transferSha);
    const fin2 = buildFinalizeEnvelope(second.initResponse, second.transferSha);
    const r2 = await handleTrainerPublishFinalize(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(fin2)
      }),
      fin2,
      {
        ...authDeps(),
        publishTrainerCourseIdempotent: (args) =>
          publishTrainerCourseIdempotent({
            ...args,
            deps: persistDepsFromWorld(world)
          })
      }
    );

    expect(r2.course_id).toBe(r1.course_id);
    expect(r2.content_fingerprint).toBe(r1.content_fingerprint);
    expect(world.stats().courseCount).toBe(1);
    expect(world.stats().lessonCount).toBe(2);
  });

  it('[MOCKED] rollback on course / topic / module / mid-lesson failure leaves zero durable rows', async () => {
    const course = buildRichCourse(3);
    const gzipBytes = zlib.gzipSync(Buffer.from(JSON.stringify(course)));

    for (const failAt of ['course', 'topic', 'module', 'lesson:2']) {
      clearAllTransferSessions();
      const world = createMockDbWorld();
      world.setFailAt(failAt);
      const init = await runInitForGzip(gzipBytes);
      await sendAllChunks(init.initResponse, init.parts, init.transferSha);
      const fin = buildFinalizeEnvelope(init.initResponse, init.transferSha);
      await expect(
        handleTrainerPublishFinalize(
          mockReq({
            'x-service-name': 'coordinator',
            'x-signature': signCoord(fin)
          }),
          fin,
          {
            ...authDeps(),
            publishTrainerCourseIdempotent: (args) =>
              publishTrainerCourseIdempotent({
                ...args,
                deps: persistDepsFromWorld(world)
              })
          }
        )
      ).rejects.toThrow(/MOCK_FAIL_/);
      expect(world.stats().courseCount).toBe(0);
      expect(world.stats().lessonCount).toBe(0);
      // Session retained for retry after recoverable failure
      expect(getTransferSession(init.initResponse.transfer_id)).not.toBeNull();
    }
  });

  it('[MOCKED] concurrent FINALIZE identical content resolves via 23505 without duplicate lessons', async () => {
    const course = buildRichCourse(2);
    const gzipBytes = zlib.gzipSync(Buffer.from(JSON.stringify(course)));
    const world = createMockDbWorld();

    const init = await runInitForGzip(gzipBytes);
    await sendAllChunks(init.initResponse, init.parts, init.transferSha);

    // Seed "winner" course as if concurrent insert already committed
    const normalized = normalizeContentStudioPayload({ ...course, trainer_id: TRAINER_A });
    const snap = buildPersistableCourseSnapshot({
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A,
      lessons: normalized.lessons
    });
    const fp = computeContentFingerprint(snap);
    const courseId = generateDeterministicCourseId({
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE,
      content_fingerprint: fp
    });

    // Pre-insert winner through mock world
    await world.mockDb.tx(async (t) => {
      await world.courseRepository.create(
        {
          id: courseId,
          course_name: normalized.course_name,
          course_description: normalized.course_description,
          created_by_user_id: TRAINER_A,
          status: 'active'
        },
        t
      );
      const topic = await world.topicRepository.create(
        { course_id: courseId, topic_name: normalized.course_name },
        t
      );
      const mod = await world.moduleRepository.create(
        { topic_id: topic.id, module_name: 'Module 1' },
        t
      );
      for (const lesson of normalized.lessons) {
        await world.lessonRepository.create(
          {
            module_id: mod.id,
            topic_id: topic.id,
            ...lesson
          },
          t
        );
      }
    });

    const before = world.stats();
    // Force create path to hit 23505 by clearing findById cache race: find returns null once then create conflicts
    let finds = 0;
    const racingRepo = {
      ...world.courseRepository,
      findById: async (id) => {
        finds += 1;
        if (finds <= 2) return null; // outer + inside tx miss
        return world.getCourse(id);
      },
      create: async () => {
        const e = new Error('duplicate key');
        e.code = '23505';
        throw e;
      }
    };

    const fin = buildFinalizeEnvelope(init.initResponse, init.transferSha);
    const result = await handleTrainerPublishFinalize(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(fin)
      }),
      fin,
      {
        ...authDeps(),
        publishTrainerCourseIdempotent: (args) =>
          publishTrainerCourseIdempotent({
            ...args,
            deps: {
              ...persistDepsFromWorld(world),
              courseRepository: racingRepo
            }
          })
      }
    );

    expect(result.course_id).toBe(courseId);
    expect(world.stats().lessonCount).toBe(before.lessonCount);
  });

  it('[MOCKED] deterministic UUID with conflicting persisted content → 409, no overwrite', async () => {
    const course = buildRichCourse(2);
    const gzipBytes = zlib.gzipSync(Buffer.from(JSON.stringify(course)));
    const world = createMockDbWorld();
    const init = await runInitForGzip(gzipBytes);
    await sendAllChunks(init.initResponse, init.parts, init.transferSha);

    const normalized = normalizeContentStudioPayload({ ...course, trainer_id: TRAINER_A });
    const snap = buildPersistableCourseSnapshot({
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A,
      lessons: normalized.lessons
    });
    const fp = computeContentFingerprint(snap);
    const courseId = generateDeterministicCourseId({
      publisher_trainer_id: TRAINER_A,
      source_course_id: SOURCE,
      content_fingerprint: fp
    });

    // Existing row with SAME id but DIFFERENT lesson HTML
    await world.courseRepository.create({
      id: courseId,
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A,
      status: 'active'
    });
    // Manually put conflicting lessons into map via snapshot override
    const conflictingSnap = buildPersistableCourseSnapshot({
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A,
      lessons: normalized.lessons.map((l, i) =>
        i === 0
          ? {
              ...l,
              content_data: [{ content_type: 'text_audio', html: '<p>TAMPERED</p>' }]
            }
          : l
      )
    });

    const fin = buildFinalizeEnvelope(init.initResponse, init.transferSha);
    await expect(
      handleTrainerPublishFinalize(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(fin)
        }),
        fin,
        {
          ...authDeps(),
          publishTrainerCourseIdempotent: (args) =>
            publishTrainerCourseIdempotent({
              ...args,
              deps: {
                ...persistDepsFromWorld(world),
                buildPersistedSnapshot: async () => conflictingSnap
              }
            })
        }
      )
    ).rejects.toMatchObject({
      status: 409,
      error_code: TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_CONFLICT
    });
  });

  it('canonical comparison preserves HTML, code, media, DevLab, skills, format_order, nested array order', () => {
    const course = buildRichCourse(2);
    const normalized = normalizeContentStudioPayload({ ...course, trainer_id: TRAINER_A });
    const snap = buildPersistableCourseSnapshot({
      course_name: normalized.course_name,
      course_description: normalized.course_description,
      created_by_user_id: TRAINER_A,
      lessons: normalized.lessons
    });

    expect(snap.lessons[0].content_data[0].html).toContain('<strong>');
    expect(snap.lessons[0].content_data[1].code).toContain('console.log');
    expect(snap.lessons[0].content_data[0].media.url).toContain('cdn.example');
    expect(snap.lessons[0].devlab_exercises[0].steps).toEqual(['A', 'B', 'C']);
    expect(snap.lessons[0].skills).toEqual(['skill-0', 'shared-skill']);
    expect(snap.lessons[0].format_order).toEqual([
      'text_audio',
      'code',
      'avatar_video'
    ]);

    // Nested array order change breaks match
    const reordered = buildPersistableCourseSnapshot({
      ...snap,
      lessons: snap.lessons.map((l, i) =>
        i === 0
          ? {
              ...l,
              content_data: [l.content_data[1], l.content_data[0]]
            }
          : l
      )
    });
    expect(persistableContentMatches(snap, reordered)).toBe(false);

    // Lesson list order change still matches (multiset)
    const swappedLessons = buildPersistableCourseSnapshot({
      ...snap,
      lessons: [snap.lessons[1], snap.lessons[0]]
    });
    expect(persistableContentMatches(snap, swappedLessons)).toBe(true);
  });

  it('lesson display queries still ORDER BY lesson_name (unchanged)', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const lessonRepo = fs.readFileSync(
      path.join(__dirname, '../repositories/LessonRepository.js'),
      'utf8'
    );
    expect(lessonRepo).toContain(
      'SELECT * FROM lessons WHERE module_id = $1 ORDER BY lesson_name'
    );
    expect(lessonRepo).toContain(
      'SELECT * FROM lessons WHERE topic_id = $1 ORDER BY lesson_name'
    );
  });

  describe('synthetic size assessment (NOT production content)', () => {
    const fixtures = [2, 30, 114, 150].map(measureCourse);

    it.each(fixtures.map((f) => [f.lessons, f]))(
      'reports sizes for %i-lesson synthetic fixture',
      (_n, m) => {
        expect(m.synthetic).toBe(true);
        expect(m.json_utf8_bytes).toBeGreaterThan(0);
        expect(m.gzip_bytes).toBeGreaterThan(0);
        expect(m.expected_chunk_count).toBeGreaterThanOrEqual(1);
        // Log for report consumption
        // eslint-disable-next-line no-console
        console.log(
          `[6F-SIZE] lessons=${m.lessons} json=${m.json_utf8_bytes} gzip=${m.gzip_bytes} chunks=${m.expected_chunk_count} fit5=${m.fits_5mib_decompress} fit8=${m.fits_8mib_compressed} fit512=${m.fits_512_chunks}`
        );
      }
    );

    it('all synthetic fixtures fit current caps', () => {
      for (const m of fixtures) {
        expect(m.fits_5mib_decompress).toBe(true);
        expect(m.fits_8mib_compressed).toBe(true);
        expect(m.fits_512_chunks).toBe(true);
      }
    });
  });
});
