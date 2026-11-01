import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSignature, verifySignature } from '../utils/signature.js';
import {
  TRAINER_PUBLISH_INIT_ACTION,
  TRAINER_PUBLISH_INIT_REQUESTER,
  TRAINER_PUBLISH_INIT_TARGET,
  TRAINER_PUBLISH_TICKET_ISS,
  buildRoutingTicketClaims,
  generateStatelessTransferId,
  signRoutingTicket
} from '../utils/trainerPublishInit.js';
import {
  TRAINER_PUBLISH_CHUNK_ACTION,
  assertValidChunkPayload,
  assertValidRoutingTicketForChunk,
  isTrainerPublishChunkRequest
} from '../utils/trainerPublishChunk.js';
import { handleTrainerPublishInit } from '../services/trainerPublish/initService.js';
import { handleTrainerPublishChunk } from '../services/trainerPublish/chunkService.js';
import {
  MAX_CHUNK_BASE64_CHARS,
  clearAllTransferSessions,
  getTransferSession,
  getTransferSessionCount,
  storeChunk
} from '../services/trainerPublish/transferMemoryStore.js';
import {
  expandCompressedTrainerPublishIfNeeded,
  COMPRESSED_TRAINER_PUBLISH_ACTION,
  COMPRESSED_TRAINER_PUBLISH_REQUESTER,
  COMPRESSED_TRAINER_PUBLISH_TARGET
} from '../utils/compressedTrainerPublish.js';

const TRAINER_A = '11111111-1111-4111-8111-111111111111';

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

describe('trainerPublishChunk', () => {
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
      // Live clock so ticket/session exp stays ahead of CHUNK Date.now() checks
      now: () => new Date()
    };
  }

  function chunkDeps() {
    return {
      loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
      loadCourseBuilderPublicKey: () => courseBuilderKeys.publicKey
    };
  }

  async function runInit(overrides = {}) {
    const payload = {
      action: TRAINER_PUBLISH_INIT_ACTION,
      targetService: TRAINER_PUBLISH_INIT_TARGET,
      publisher_trainer_id: TRAINER_A,
      source_course_id: 'cs-course-114',
      transfer_sha256: 'a'.repeat(64),
      expected_chunk_count: 3,
      ...overrides
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
    return { envelope, initResponse };
  }

  function buildChunkEnvelope(initResponse, chunkIndex, chunkBytes, extra = {}) {
    const claims = initResponse.routing_ticket.claims;
    const payload = {
      action: TRAINER_PUBLISH_CHUNK_ACTION,
      targetService: TRAINER_PUBLISH_INIT_TARGET,
      routing_ticket: initResponse.routing_ticket,
      transfer_id: initResponse.transfer_id,
      transfer_sha256: claims.transfer_sha256,
      expected_chunk_count: claims.expected_chunk_count,
      publisher_trainer_id: claims.publisher_trainer_id,
      source_course_id: claims.source_course_id,
      chunk_index: chunkIndex,
      chunk_data: Buffer.from(chunkBytes).toString('base64'),
      ...extra
    };
    return {
      requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
      payload,
      response: {}
    };
  }

  it('matches only exact CHUNK identity', () => {
    expect(
      isTrainerPublishChunkRequest(TRAINER_PUBLISH_INIT_REQUESTER, {
        action: TRAINER_PUBLISH_CHUNK_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET
      })
    ).toBe(true);
    expect(
      isTrainerPublishChunkRequest(TRAINER_PUBLISH_INIT_REQUESTER, {
        action: TRAINER_PUBLISH_INIT_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET
      })
    ).toBe(false);
  });

  it('valid Coord-signed CHUNK with valid CB ticket stores chunk', async () => {
    const { initResponse } = await runInit();
    const envelope = buildChunkEnvelope(initResponse, 1, 'hello-chunk-1');
    const req = mockReq({
      'x-service-name': 'coordinator',
      'x-signature': signCoord(envelope)
    });
    const ack = await handleTrainerPublishChunk(req, envelope, chunkDeps());
    expect(ack).toEqual({
      status: 'chunk_received',
      transfer_id: initResponse.transfer_id,
      chunk_index: 1,
      received_chunks: 1,
      expected_chunk_count: 3
    });
    const session = getTransferSession(initResponse.transfer_id);
    expect(session.chunks.get(1).toString()).toBe('hello-chunk-1');
  });

  it('rejects missing Coordinator signature', async () => {
    const { initResponse } = await runInit();
    const envelope = buildChunkEnvelope(initResponse, 0, 'x');
    await expect(
      handleTrainerPublishChunk(
        mockReq({ 'x-service-name': 'coordinator' }),
        envelope,
        chunkDeps()
      )
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects expired CB ticket', async () => {
    const { initResponse } = await runInit();
    const expiredClaims = {
      ...initResponse.routing_ticket.claims,
      exp: Math.floor(Date.now() / 1000) - 10
    };
    const expiredTicket = signRoutingTicket(
      expiredClaims,
      courseBuilderKeys.privateKey
    );
    const envelope = buildChunkEnvelope(initResponse, 0, 'x', {
      routing_ticket: expiredTicket
    });
    // Fix transfer_id binding on payload to match expired claims transfer_id
    envelope.payload.transfer_id = expiredClaims.transfer_id;
    const req = mockReq({
      'x-service-name': 'coordinator',
      'x-signature': signCoord(envelope)
    });
    await expect(
      handleTrainerPublishChunk(req, envelope, chunkDeps())
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects publisher mismatch vs ticket', async () => {
    const { initResponse } = await runInit();
    const envelope = buildChunkEnvelope(initResponse, 0, 'x', {
      publisher_trainer_id: '22222222-2222-4222-8222-222222222222'
    });
    const req = mockReq({
      'x-service-name': 'coordinator',
      'x-signature': signCoord(envelope)
    });
    await expect(
      handleTrainerPublishChunk(req, envelope, chunkDeps())
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects invalid chunk_index', async () => {
    const { initResponse } = await runInit();
    const envelope = buildChunkEnvelope(initResponse, 99, 'x');
    const req = mockReq({
      'x-service-name': 'coordinator',
      'x-signature': signCoord(envelope)
    });
    await expect(
      handleTrainerPublishChunk(req, envelope, chunkDeps())
    ).rejects.toThrow(/chunk_index/i);
  });

  it('duplicate identical chunk is idempotent', async () => {
    const { initResponse } = await runInit();
    const envelope = buildChunkEnvelope(initResponse, 0, 'same');
    const req = mockReq({
      'x-service-name': 'coordinator',
      'x-signature': signCoord(envelope)
    });
    const first = await handleTrainerPublishChunk(req, envelope, chunkDeps());
    const envelope2 = buildChunkEnvelope(initResponse, 0, 'same');
    const req2 = mockReq({
      'x-service-name': 'coordinator',
      'x-signature': signCoord(envelope2)
    });
    const second = await handleTrainerPublishChunk(req2, envelope2, chunkDeps());
    expect(first.received_chunks).toBe(1);
    expect(second.received_chunks).toBe(1);
    expect(getTransferSession(initResponse.transfer_id).chunks.size).toBe(1);
  });

  it('conflicting duplicate chunk is rejected', async () => {
    const { initResponse } = await runInit();
    const e1 = buildChunkEnvelope(initResponse, 0, 'aaa');
    await handleTrainerPublishChunk(
      mockReq({
        'x-service-name': 'coordinator',
        'x-signature': signCoord(e1)
      }),
      e1,
      chunkDeps()
    );
    const e2 = buildChunkEnvelope(initResponse, 0, 'bbb');
    await expect(
      handleTrainerPublishChunk(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(e2)
        }),
        e2,
        chunkDeps()
      )
    ).rejects.toMatchObject({ status: 409 });
  });

  it('accepts out-of-order chunks', async () => {
    const { initResponse } = await runInit();
    for (const idx of [2, 0, 1]) {
      const envelope = buildChunkEnvelope(initResponse, idx, `c${idx}`);
      await handleTrainerPublishChunk(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        chunkDeps()
      );
    }
    const session = getTransferSession(initResponse.transfer_id);
    expect(session.chunks.size).toBe(3);
    expect(session.chunks.get(0).toString()).toBe('c0');
    expect(session.chunks.get(2).toString()).toBe('c2');
  });

  it('rejects oversized chunk_data', () => {
    const huge = 'A'.repeat(MAX_CHUNK_BASE64_CHARS + 4);
    expect(() =>
      assertValidChunkPayload({ chunk_index: 0, chunk_data: huge })
    ).toThrow(/maximum length/i);
  });

  it('rejects invalid Base64 chunk_data', () => {
    expect(() =>
      assertValidChunkPayload({ chunk_index: 0, chunk_data: '!!!' })
    ).toThrow(/Base64/i);
  });

  it('expired/missing memory session returns 410', async () => {
    const { initResponse } = await runInit();
    clearAllTransferSessions();
    const envelope = buildChunkEnvelope(initResponse, 0, 'x');
    await expect(
      handleTrainerPublishChunk(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signCoord(envelope)
        }),
        envelope,
        chunkDeps()
      )
    ).rejects.toMatchObject({ status: 410 });
  });

  it('INIT remains functional and seeds memory without DB', async () => {
    const { initResponse } = await runInit();
    expect(initResponse.status).toBe('initialized');
    expect(getTransferSession(initResponse.transfer_id)).toBeTruthy();
    expect(getTransferSessionCount()).toBe(1);
  });

  it('ticket verify requires CB signature over claims', () => {
    const claims = buildRoutingTicketClaims({
      transfer_id: generateStatelessTransferId({
        publisher_trainer_id: TRAINER_A,
        source_course_id: 's',
        transfer_sha256: 'e'.repeat(64),
        expected_chunk_count: 2
      }),
      exp: Math.floor(Date.now() / 1000) + 3600,
      publisher_trainer_id: TRAINER_A,
      source_course_id: 's',
      transfer_sha256: 'e'.repeat(64),
      expected_chunk_count: 2
    });
    const ticket = signRoutingTicket(claims, courseBuilderKeys.privateKey);
    expect(
      verifySignature(
        TRAINER_PUBLISH_TICKET_ISS,
        ticket.signature,
        courseBuilderKeys.publicKey,
        claims
      )
    ).toBe(true);

    expect(() =>
      assertValidRoutingTicketForChunk(
        {
          routing_ticket: ticket,
          transfer_id: claims.transfer_id,
          transfer_sha256: claims.transfer_sha256,
          expected_chunk_count: 2,
          publisher_trainer_id: TRAINER_A,
          source_course_id: 's'
        },
        courseBuilderKeys.publicKey
      )
    ).not.toThrow();
  });

  it('storeChunk does not touch database modules', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const src = fs.readFileSync(
      path.join(dir, '../services/trainerPublish/chunkService.js'),
      'utf8'
    );
    expect(src).not.toMatch(/database/);
    expect(src).not.toMatch(/CourseRepository/);
    expect(src).not.toMatch(/LessonRepository/);
  });
});

describe('CHUNK non-regression isolation', () => {
  it('does not intercept Full AI payloads', () => {
    expect(
      isTrainerPublishChunkRequest('course-builder-service', {
        action: 'generate_course_content'
      })
    ).toBe(false);
  });

  it('legacy trainer publish expand path unchanged', () => {
    const payload = {
      action: COMPRESSED_TRAINER_PUBLISH_ACTION,
      targetService: COMPRESSED_TRAINER_PUBLISH_TARGET,
      trainer_id: TRAINER_A,
      course_id: '353009a4-3458-44b3-8740-ebb87f4c65d7',
      topics: [{ topic_name: 'T', contents: [] }]
    };
    expect(
      expandCompressedTrainerPublishIfNeeded(
        COMPRESSED_TRAINER_PUBLISH_REQUESTER,
        payload
      )
    ).toBe(payload);
  });

  it('controller wires CHUNK before expand and determineTargetService', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const src = fs.readFileSync(
      path.join(dir, '../controllers/integration.controller.js'),
      'utf8'
    );
    const chunkIdx = src.indexOf('isTrainerPublishChunkRequest(requesterService');
    const expandIdx = src.indexOf('expandCompressedTrainerPublishIfNeeded(');
    const determineIdx = src.indexOf(
      'targetService = determineTargetService(payloadObject'
    );
    expect(chunkIdx).toBeGreaterThan(-1);
    expect(expandIdx).toBeGreaterThan(chunkIdx);
    expect(determineIdx).toBeGreaterThan(expandIdx);
  });
});
