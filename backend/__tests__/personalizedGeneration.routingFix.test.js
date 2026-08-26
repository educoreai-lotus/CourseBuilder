/**
 * Async CS routing fix: Coordinator action override + response validation.
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildConservativeCsPayload,
  extractContentStudioJobId,
  isValidContentStudioJobId,
  extractKnownContentStudioStatus,
  assertValidContentStudioResult,
  CS_COORDINATOR_ROUTING_ACTION
} from '../services/personalizedGeneration/contentStudioAsyncGateway.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const learnerPayload = {
  action: 'push_learning_path',
  description: 'from learner',
  user_id: 'u1',
  user_name: 'Ada',
  company_id: 'co1',
  company_name: 'Acme',
  competency_target_name: 'React',
  skills_raw_data: ['hooks'],
  preferred_language: 'en',
  exam_status: 'pass',
  learning_path: { path_title: 'P', learning_modules: [{ module_order: 1 }] }
};

describe('async CS Coordinator routing action', () => {
  it('forces generate_course_content for START/STATUS/RESULT and preserves original_action', () => {
    const cases = [
      'start_personalized_generation',
      'get_personalized_generation_status',
      'get_personalized_generation_result'
    ];
    for (const csAction of cases) {
      const frozen = { ...learnerPayload };
      const payload = buildConservativeCsPayload({
        requestPayload: learnerPayload,
        courseId: 'course-1',
        parentCourseBuilderJobId: 'cb-1',
        contentStudioJobId: 'cs-1',
        csGenerationAction: csAction
      });
      expect(payload.action).toBe(CS_COORDINATOR_ROUTING_ACTION);
      expect(payload.action).toBe('generate_course_content');
      expect(payload.original_action).toBe('push_learning_path');
      expect(payload.cs_generation_action).toBe(csAction);
      expect(payload.learning_path).toEqual(frozen.learning_path);
      expect(payload.skills_raw_data).toEqual(['hooks']);
      expect(payload.user_id).toBe('u1');
      expect(payload.competency_target_name).toBe('React');
      expect(payload.preferred_language).toBe('en');
      expect(payload.exam_status).toBe('pass');
      expect(learnerPayload.action).toBe('push_learning_path');
      expect(learnerPayload).toEqual(frozen);
    }
  });

  it('async gateway still posts only via Coordinator (no direct CS client import)', () => {
    const gatewaySrc = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'services',
        'personalizedGeneration',
        'contentStudioAsyncGateway.js'
      ),
      'utf8'
    );
    expect(gatewaySrc).toMatch(/postToCoordinator/);
    expect(gatewaySrc).not.toMatch(/CONTENT_STUDIO_URL/);
    expect(gatewaySrc).not.toMatch(/axios\.create/);
  });
});

describe('START response validation helpers', () => {
  it('requires non-empty generation_job.cs_job_id', () => {
    expect(
      extractContentStudioJobId({
        generation_job: { cs_job_id: 'abc' }
      })
    ).toBe('abc');
    expect(isValidContentStudioJobId('abc')).toBe(true);

    expect(extractContentStudioJobId({ generation_job: null })).toBeNull();
    expect(extractContentStudioJobId({ generation_job: {} })).toBeNull();
    expect(
      extractContentStudioJobId({ generation_job: { cs_job_id: '' } })
    ).toBeNull();
    expect(extractContentStudioJobId({})).toBeNull();
    expect(isValidContentStudioJobId(null)).toBe(false);
    expect(isValidContentStudioJobId('')).toBe(false);
  });
});

describe('STATUS response validation helpers', () => {
  it('accepts only known CS business statuses', () => {
    expect(extractKnownContentStudioStatus({ status: 'pending' })).toBe('pending');
    expect(extractKnownContentStudioStatus({ status: 'processing' })).toBe(
      'processing'
    );
    expect(extractKnownContentStudioStatus({ status: 'completed' })).toBe(
      'completed'
    );
    expect(extractKnownContentStudioStatus({ status: 'failed' })).toBe('failed');
    expect(
      extractKnownContentStudioStatus({ generation_job: { status: 'PROCESSING' } })
    ).toBe('processing');
  });

  it('rejects missing / unknown / Learner-shaped status bodies', () => {
    expect(extractKnownContentStudioStatus({})).toBeNull();
    expect(extractKnownContentStudioStatus({ status: 'ok' })).toBeNull();
    expect(
      extractKnownContentStudioStatus({ action: 'push_learning_path' })
    ).toBeNull();
  });
});

describe('RESULT response validation helpers', () => {
  it('accepts CS course RESULT envelopes', () => {
    expect(() =>
      assertValidContentStudioResult({
        course: [{ topics: [] }]
      })
    ).not.toThrow();
    expect(() =>
      assertValidContentStudioResult({
        generation_job: { status: 'pending' }
      })
    ).not.toThrow();
  });

  it('rejects empty or wrong-service RESULT bodies', () => {
    expect(() => assertValidContentStudioResult({})).toThrow(/empty|valid/i);
    expect(() =>
      assertValidContentStudioResult({ action: 'push_learning_path' })
    ).toThrow(/valid/i);
    expect(() => assertValidContentStudioResult(null)).toThrow();
  });
});

describe('legacy sync flag-OFF path source unchanged', () => {
  it('learnerAIHandler still hardcodes generate_course_content for sync CS call', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'integration', 'handlers', 'learnerAIHandler.js'),
      'utf8'
    );
    expect(src).toMatch(/action:\s*'generate_course_content'/);
    expect(src).toMatch(/isPersonalizedAsyncGenerationEnabled/);
  });
});
