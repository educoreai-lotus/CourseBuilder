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
  assertCoordinatorSignedInitEnvelope,
  assertValidTrainerPublishInitMetadata,
  buildRoutingTicketClaims,
  generateStatelessTransferId,
  isTrainerPublishInitRequest,
  signRoutingTicket
} from '../utils/trainerPublishInit.js';
import { handleTrainerPublishInit } from '../services/trainerPublish/initService.js';
import { clearAllTransferSessions } from '../services/trainerPublish/transferMemoryStore.js';
import {
  COMPRESSED_TRAINER_PUBLISH_ACTION,
  COMPRESSED_TRAINER_PUBLISH_ENCODING,
  COMPRESSED_TRAINER_PUBLISH_REQUESTER,
  COMPRESSED_TRAINER_PUBLISH_TARGET,
  expandCompressedTrainerPublishIfNeeded
} from '../utils/compressedTrainerPublish.js';

const TRAINER_A = '11111111-1111-4111-8111-111111111111';
const TRAINER_B = '22222222-2222-4222-8222-222222222222';

function generateEcKeyPair() {
  return crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

function buildInitEnvelope(overrides = {}) {
  const payload = {
    action: TRAINER_PUBLISH_INIT_ACTION,
    targetService: TRAINER_PUBLISH_INIT_TARGET,
    publisher_trainer_id: TRAINER_A,
    source_course_id: 'cs-course-114',
    transfer_sha256: 'a'.repeat(64),
    expected_chunk_count: 12,
    ...overrides.payload
  };
  return {
    requester_service: TRAINER_PUBLISH_INIT_REQUESTER,
    payload,
    response: {},
    ...overrides
  };
}

function mockReq(headers = {}) {
  return { headers };
}

describe('trainerPublishInit helpers', () => {
  it('matches only the exact INIT identity', () => {
    expect(
      isTrainerPublishInitRequest(
        TRAINER_PUBLISH_INIT_REQUESTER,
        buildInitEnvelope().payload
      )
    ).toBe(true);
  });

  it('does not match Full AI Generation payloads', () => {
    expect(
      isTrainerPublishInitRequest('course-builder-service', {
        action: 'generate_course_content',
        learning_path: {}
      })
    ).toBe(false);
  });

  it('does not match legacy / compressed Trainer Publish actions', () => {
    expect(
      isTrainerPublishInitRequest(COMPRESSED_TRAINER_PUBLISH_REQUESTER, {
        action: COMPRESSED_TRAINER_PUBLISH_ACTION,
        targetService: COMPRESSED_TRAINER_PUBLISH_TARGET,
        course_encoding: COMPRESSED_TRAINER_PUBLISH_ENCODING,
        course_compressed: 'abc'
      })
    ).toBe(false);
  });

  it('rejects missing or invalid publisher_trainer_id', () => {
    expect(() =>
      assertValidTrainerPublishInitMetadata({
        action: TRAINER_PUBLISH_INIT_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET,
        source_course_id: 'x',
        transfer_sha256: 'b'.repeat(64),
        expected_chunk_count: 1
      })
    ).toThrow(/publisher_trainer_id/i);

    expect(() =>
      assertValidTrainerPublishInitMetadata({
        publisher_trainer_id: 'not-a-uuid',
        source_course_id: 'x',
        transfer_sha256: 'b'.repeat(64),
        expected_chunk_count: 1
      })
    ).toThrow(/publisher_trainer_id/i);
  });

  it('rejects invalid transfer_sha256', () => {
    expect(() =>
      assertValidTrainerPublishInitMetadata({
        publisher_trainer_id: TRAINER_A,
        source_course_id: 'x',
        transfer_sha256: 'not-a-hash',
        expected_chunk_count: 1
      })
    ).toThrow(/transfer_sha256/i);
  });

  it('rejects invalid organization_id when provided', () => {
    expect(() =>
      assertValidTrainerPublishInitMetadata({
        publisher_trainer_id: TRAINER_A,
        organization_id: 'bad',
        source_course_id: 'x',
        transfer_sha256: 'b'.repeat(64),
        expected_chunk_count: 1
      })
    ).toThrow(/organization_id/i);
  });

  it('accepts optional organization_id UUID', () => {
    const meta = assertValidTrainerPublishInitMetadata({
      publisher_trainer_id: TRAINER_A,
      organization_id: '33333333-3333-4333-8333-333333333333',
      source_course_id: 'x',
      transfer_sha256: 'b'.repeat(64),
      expected_chunk_count: 2
    });
    expect(meta.organization_id).toBe('33333333-3333-4333-8333-333333333333');
  });

  it('stateless transfer_id is stable for same identity and differs across publishers', () => {
    const base = {
      source_course_id: 'src-1',
      transfer_sha256: 'c'.repeat(64),
      expected_chunk_count: 3
    };
    const a = generateStatelessTransferId({
      ...base,
      publisher_trainer_id: TRAINER_A
    });
    const b = generateStatelessTransferId({
      ...base,
      publisher_trainer_id: TRAINER_A
    });
    const c = generateStatelessTransferId({
      ...base,
      publisher_trainer_id: TRAINER_B
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('Coordinator inbound auth for INIT', () => {
  let coordinatorKeys;

  beforeAll(() => {
    coordinatorKeys = generateEcKeyPair();
  });

  it('accepts a valid Coordinator-signed envelope', () => {
    const envelope = buildInitEnvelope();
    const signature = generateSignature(
      'coordinator',
      coordinatorKeys.privateKey,
      envelope
    );
    expect(() =>
      assertCoordinatorSignedInitEnvelope(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signature
        }),
        envelope,
        coordinatorKeys.publicKey
      )
    ).not.toThrow();
  });

  it('rejects missing signature', () => {
    expect(() =>
      assertCoordinatorSignedInitEnvelope(
        mockReq({ 'x-service-name': 'coordinator' }),
        buildInitEnvelope(),
        coordinatorKeys.publicKey
      )
    ).toThrow(/X-Signature/i);
  });

  it('rejects invalid signature', () => {
    expect(() =>
      assertCoordinatorSignedInitEnvelope(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': 'not-a-real-signature'
        }),
        buildInitEnvelope(),
        coordinatorKeys.publicKey
      )
    ).toThrow(/verification failed/i);
  });

  it('rejects when Coordinator public key is unavailable (fail-closed)', () => {
    const envelope = buildInitEnvelope();
    const signature = generateSignature(
      'coordinator',
      coordinatorKeys.privateKey,
      envelope
    );
    try {
      assertCoordinatorSignedInitEnvelope(
        mockReq({
          'x-service-name': 'coordinator',
          'x-signature': signature
        }),
        envelope,
        null
      );
      throw new Error('expected throw');
    } catch (err) {
      expect(err.status).toBe(503);
    }
  });
});

describe('handleTrainerPublishInit service (Phase 1C)', () => {
  let coordinatorKeys;
  let courseBuilderKeys;

  beforeAll(() => {
    coordinatorKeys = generateEcKeyPair();
    courseBuilderKeys = generateEcKeyPair();
  });

  beforeEach(() => {
    clearAllTransferSessions();
  });

  function signedReq(envelope) {
    const signature = generateSignature(
      'coordinator',
      coordinatorKeys.privateKey,
      envelope
    );
    return mockReq({
      'x-service-name': 'coordinator',
      'x-signature': signature
    });
  }

  const deps = () => ({
    loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
    loadCourseBuilderPrivateKey: () => courseBuilderKeys.privateKey,
    now: () => new Date('2026-11-01T12:00:00.000Z')
  });

  it('valid INIT succeeds with publisher_trainer_id and transfer_sha256 bound to ticket', async () => {
    const envelope = buildInitEnvelope();
    const result = await handleTrainerPublishInit(
      signedReq(envelope),
      envelope,
      deps()
    );

    expect(result.status).toBe('initialized');
    expect(result.transfer_id).toBe(
      generateStatelessTransferId({
        publisher_trainer_id: TRAINER_A,
        source_course_id: 'cs-course-114',
        transfer_sha256: 'a'.repeat(64),
        expected_chunk_count: 12
      })
    );
    expect(result.expires_at).toBe('2026-11-01T13:00:00.000Z');
    expect(result.routing_ticket.claims.publisher_trainer_id).toBe(TRAINER_A);
    expect(result.routing_ticket.claims.transfer_sha256).toBe('a'.repeat(64));
    expect(result.routing_ticket.claims.content_sha256).toBeUndefined();
    expect(result.routing_ticket.claims.content_fingerprint).toBeUndefined();
    expect(result.routing_ticket.claims.ops).toEqual(['chunk', 'finalize']);

    expect(
      verifySignature(
        TRAINER_PUBLISH_TICKET_ISS,
        result.routing_ticket.signature,
        courseBuilderKeys.publicKey,
        result.routing_ticket.claims
      )
    ).toBe(true);
  });

  it('claims key order is deterministic without organization_id', () => {
    const claims = buildRoutingTicketClaims({
      transfer_id: '00000000-0000-4000-8000-000000000001',
      exp: 1700000000,
      publisher_trainer_id: TRAINER_A,
      source_course_id: 'src',
      transfer_sha256: 'c'.repeat(64),
      expected_chunk_count: 3
    });
    expect(Object.keys(claims)).toEqual([
      'transfer_id',
      'iss',
      'aud',
      'requester',
      'dest',
      'ops',
      'exp',
      'publisher_trainer_id',
      'source_course_id',
      'transfer_sha256',
      'expected_chunk_count'
    ]);
  });

  it('includes organization_id in claims and transfer_id when provided', async () => {
    const orgId = '33333333-3333-4333-8333-333333333333';
    const envelope = buildInitEnvelope({
      payload: {
        action: TRAINER_PUBLISH_INIT_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET,
        publisher_trainer_id: TRAINER_A,
        organization_id: orgId,
        source_course_id: 'cs-course-114',
        transfer_sha256: 'a'.repeat(64),
        expected_chunk_count: 12
      }
    });
    const result = await handleTrainerPublishInit(
      signedReq(envelope),
      envelope,
      deps()
    );
    expect(result.routing_ticket.claims.organization_id).toBe(orgId);
    expect(result.transfer_id).toBe(
      generateStatelessTransferId({
        publisher_trainer_id: TRAINER_A,
        organization_id: orgId,
        source_course_id: 'cs-course-114',
        transfer_sha256: 'a'.repeat(64),
        expected_chunk_count: 12
      })
    );
  });

  it('different publishers with same source and transfer_sha256 get different transfer_ids', async () => {
    const d = deps();
    const e1 = buildInitEnvelope({
      payload: {
        action: TRAINER_PUBLISH_INIT_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET,
        publisher_trainer_id: TRAINER_A,
        source_course_id: 'same-course',
        transfer_sha256: 'd'.repeat(64),
        expected_chunk_count: 5
      }
    });
    const e2 = buildInitEnvelope({
      payload: {
        action: TRAINER_PUBLISH_INIT_ACTION,
        targetService: TRAINER_PUBLISH_INIT_TARGET,
        publisher_trainer_id: TRAINER_B,
        source_course_id: 'same-course',
        transfer_sha256: 'd'.repeat(64),
        expected_chunk_count: 5
      }
    });
    const r1 = await handleTrainerPublishInit(signedReq(e1), e1, d);
    const r2 = await handleTrainerPublishInit(signedReq(e2), e2, d);
    expect(r1.transfer_id).not.toBe(r2.transfer_id);
  });

  it('repeated identical INIT returns the same transfer_id', async () => {
    const d = deps();
    const envelope = buildInitEnvelope();
    const first = await handleTrainerPublishInit(signedReq(envelope), envelope, d);
    const second = await handleTrainerPublishInit(signedReq(envelope), envelope, d);
    expect(second.transfer_id).toBe(first.transfer_id);
  });

  it('initService has no database dependency', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const src = fs.readFileSync(
      path.join(dir, '../services/trainerPublish/initService.js'),
      'utf8'
    );
    expect(src).not.toMatch(/TrainerPublishTransferRepository/);
    expect(src).not.toMatch(/from ['"].*database/);
    expect(src).not.toMatch(/trainer_publish_transfers/);
  });

  it('rejects missing Coordinator signature before ticket issuance', async () => {
    const envelope = buildInitEnvelope();
    await expect(
      handleTrainerPublishInit(
        mockReq({ 'x-service-name': 'coordinator' }),
        envelope,
        deps()
      )
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects missing PRIVATE_KEY with 503', async () => {
    const envelope = buildInitEnvelope();
    await expect(
      handleTrainerPublishInit(signedReq(envelope), envelope, {
        loadCoordinatorPublicKey: () => coordinatorKeys.publicKey,
        loadCourseBuilderPrivateKey: () => null
      })
    ).rejects.toMatchObject({ status: 503 });
  });
});

describe('non-INIT path isolation', () => {
  it('leaves Full AI style payloads unchanged by reference via compress expand', () => {
    const payload = {
      action: 'generate_course_content',
      user_id: 'u1',
      learning_path: { modules: [] }
    };
    expect(
      expandCompressedTrainerPublishIfNeeded('course-builder-service', payload)
    ).toBe(payload);
  });

  it('leaves legacy uncompressed trainer publish unchanged', () => {
    const payload = {
      action: COMPRESSED_TRAINER_PUBLISH_ACTION,
      targetService: COMPRESSED_TRAINER_PUBLISH_TARGET,
      trainer_id: TRAINER_A,
      course_id: '353009a4-3458-44b3-8740-ebb87f4c65d7',
      topics: [{ topic_name: 'T', contents: [] }]
    };
    expect(
      isTrainerPublishInitRequest(COMPRESSED_TRAINER_PUBLISH_REQUESTER, payload)
    ).toBe(false);
    expect(
      expandCompressedTrainerPublishIfNeeded(
        COMPRESSED_TRAINER_PUBLISH_REQUESTER,
        payload
      )
    ).toBe(payload);
  });
});

describe('controller wiring (source contract)', () => {
  it('INIT gate runs before compress expand and determineTargetService', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const src = fs.readFileSync(
      path.join(dir, '../controllers/integration.controller.js'),
      'utf8'
    );
    const initIdx = src.indexOf('isTrainerPublishInitRequest(requesterService');
    const expandIdx = src.indexOf('expandCompressedTrainerPublishIfNeeded(');
    const determineIdx = src.indexOf('targetService = determineTargetService(payloadObject');
    expect(initIdx).toBeGreaterThan(-1);
    expect(expandIdx).toBeGreaterThan(initIdx);
    expect(determineIdx).toBeGreaterThan(expandIdx);
  });

  it('signRoutingTicket verifies with Course Builder public key', () => {
    const { privateKey, publicKey } = generateEcKeyPair();
    const claims = buildRoutingTicketClaims({
      transfer_id: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 3600,
      publisher_trainer_id: TRAINER_A,
      source_course_id: 'src-1',
      transfer_sha256: 'd'.repeat(64),
      expected_chunk_count: 2
    });
    const ticket = signRoutingTicket(claims, privateKey);
    expect(
      verifySignature(TRAINER_PUBLISH_TICKET_ISS, ticket.signature, publicKey, claims)
    ).toBe(true);
  });
});
