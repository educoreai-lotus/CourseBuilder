/**
 * Service key loaders for inter-service ECDSA (PEM).
 * Mirrors coordinatorClient loading rules without coupling outbound client logic.
 * Never logs key material.
 */

import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedPrivateKey = null;
let cachedCoordinatorPublicKey = null;
let cachedCourseBuilderPublicKey = null;

/**
 * Course Builder private key (PEM) for outbound signing / routing tickets.
 * @returns {string|null}
 */
export function loadCourseBuilderPrivateKey() {
  if (process.env.PRIVATE_KEY) {
    return process.env.PRIVATE_KEY;
  }

  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  const privateKeyPath = path.join(__dirname, '..', 'course-builder-private-key.pem');
  try {
    if (fs.existsSync(privateKeyPath)) {
      cachedPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');
      return cachedPrivateKey;
    }
  } catch {
    // Fail closed at call site if missing.
  }

  return null;
}

/**
 * Coordinator public key (PEM) for inbound request verification.
 * @returns {string|null}
 */
export function loadCoordinatorPublicKey() {
  if (process.env.COORDINATOR_PUBLIC_KEY) {
    return process.env.COORDINATOR_PUBLIC_KEY;
  }

  if (cachedCoordinatorPublicKey) {
    return cachedCoordinatorPublicKey;
  }

  const coordinatorKeyPath = path.join(
    __dirname,
    '..',
    '..',
    'services',
    'course-builder-service',
    'keys',
    'coordinator-public-key.pem'
  );
  try {
    if (fs.existsSync(coordinatorKeyPath)) {
      cachedCoordinatorPublicKey = fs.readFileSync(coordinatorKeyPath, 'utf8');
      return cachedCoordinatorPublicKey;
    }
  } catch {
    // Fail closed at call site if missing.
  }

  return null;
}

/**
 * Course Builder public key (PEM) for verifying CB-issued routing tickets.
 * Prefers COURSE_BUILDER_PUBLIC_KEY / file; otherwise derives SPKI PEM from PRIVATE_KEY.
 * @returns {string|null}
 */
export function loadCourseBuilderPublicKey() {
  if (process.env.COURSE_BUILDER_PUBLIC_KEY) {
    return process.env.COURSE_BUILDER_PUBLIC_KEY;
  }

  if (cachedCourseBuilderPublicKey) {
    return cachedCourseBuilderPublicKey;
  }

  const publicKeyPath = path.join(__dirname, '..', 'course-builder-public-key.pem');
  try {
    if (fs.existsSync(publicKeyPath)) {
      cachedCourseBuilderPublicKey = fs.readFileSync(publicKeyPath, 'utf8');
      return cachedCourseBuilderPublicKey;
    }
  } catch {
    // fall through
  }

  const privateKey = loadCourseBuilderPrivateKey();
  if (privateKey) {
    try {
      const pub = crypto.createPublicKey(privateKey);
      cachedCourseBuilderPublicKey = pub.export({ type: 'spki', format: 'pem' });
      return cachedCourseBuilderPublicKey;
    } catch {
      return null;
    }
  }

  return null;
}

/** Test-only: clear cached PEMs so env overrides apply. */
export function clearServiceKeyCache() {
  cachedPrivateKey = null;
  cachedCoordinatorPublicKey = null;
  cachedCourseBuilderPublicKey = null;
}

export default {
  loadCourseBuilderPrivateKey,
  loadCoordinatorPublicKey,
  loadCourseBuilderPublicKey,
  clearServiceKeyCache
};
