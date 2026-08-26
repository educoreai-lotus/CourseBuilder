/**
 * Job repository claim/idempotency contract (source-level, no live DB).
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoPath = path.join(
  __dirname,
  '..',
  'repositories',
  'PersonalizedGenerationJobRepository.js'
);
const migrationPath = path.join(
  __dirname,
  '..',
  'database',
  'migrations',
  '004_add_personalized_generation_jobs.sql'
);

describe('PersonalizedGenerationJobRepository + migration contracts', () => {
  const repoSrc = fs.readFileSync(repoPath, 'utf8');
  const migrationSrc = fs.readFileSync(migrationPath, 'utf8');

  it('claim uses FOR UPDATE SKIP LOCKED and increments attempt_count', () => {
    expect(repoSrc).toMatch(/FOR UPDATE SKIP LOCKED/);
    expect(repoSrc).toMatch(/attempt_count = attempt_count \+ 1/);
    expect(repoSrc).toMatch(/next_action_at <= CURRENT_TIMESTAMP/);
    expect(repoSrc).toMatch(/lease_expires_at < CURRENT_TIMESTAMP/);
  });

  it('heartbeat and fenced updates require attempt_count + processing + lease', () => {
    expect(repoSrc).toMatch(/AND attempt_count = \$2/);
    expect(repoSrc).toMatch(/AND status = 'processing'/);
    expect(repoSrc).toMatch(/lease_expires_at > CURRENT_TIMESTAMP/);
  });

  it('createOrGetActiveJob handles unique violation 23505', () => {
    expect(repoSrc).toMatch(/23505/);
    expect(repoSrc).toMatch(/createOrGetActiveJob/);
  });

  it('migration has partial unique index for one active job', () => {
    expect(migrationSrc).toMatch(/idx_personalized_generation_jobs_one_active/);
    expect(migrationSrc).toMatch(/WHERE status IN \('pending', 'processing'\)/);
    expect(migrationSrc).toMatch(/CREATE TABLE personalized_generation_jobs/);
    expect(migrationSrc).not.toMatch(/ALTER TABLE courses/);
    expect(migrationSrc).not.toMatch(/finalization_started_at/);
  });

  it('terminal statuses are outside the active unique index', () => {
    expect(migrationSrc).toMatch(/CHECK \(status IN \('pending', 'processing', 'completed', 'failed'\)\)/);
  });

  it('scheduleNextAction releases lease via scheduleAndReleaseClaim', () => {
    expect(repoSrc).toMatch(
      /async scheduleNextAction[\s\S]*return this\.scheduleAndReleaseClaim/
    );
    expect(repoSrc).toMatch(/locked_at = NULL/);
    expect(repoSrc).toMatch(/lease_expires_at = NULL/);
  });
});
