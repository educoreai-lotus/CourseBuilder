/**
 * Coordinator Client
 * Handles all signed communication with the Coordinator service
 * Routes all microservice-to-microservice requests through Coordinator
 */

import { generateSignature, verifySignature } from '../../utils/signature.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_NAME = process.env.SERVICE_NAME || 'course-builder-service';
const COORDINATOR_URL = process.env.COORDINATOR_URL;

// Load private key from environment or file
let PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  // Try to load from local file (for development)
  const privateKeyPath = path.join(__dirname, '..', '..', 'course-builder-private-key.pem');
  try {
    if (fs.existsSync(privateKeyPath)) {
      PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');
      console.log('[CoordinatorClient] Loaded private key from file');
    }
  } catch (error) {
    console.warn('[CoordinatorClient] Could not load private key from file:', error.message);
  }
}

// Load Coordinator public key from environment or file
let COORDINATOR_PUBLIC_KEY = process.env.COORDINATOR_PUBLIC_KEY;
if (!COORDINATOR_PUBLIC_KEY) {
  // Try to load from repo file
  const coordinatorKeyPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'services',
    'course-builder-service',
    'keys',
    'coordinator-public-key.pem'
  );
  try {
    if (fs.existsSync(coordinatorKeyPath)) {
      COORDINATOR_PUBLIC_KEY = fs.readFileSync(coordinatorKeyPath, 'utf8');
      console.log('[CoordinatorClient] Loaded Coordinator public key from file');
    }
  } catch (error) {
    console.warn('[CoordinatorClient] Could not load Coordinator public key from file:', error.message);
  }
}

if (!COORDINATOR_URL) {
  console.warn('[CoordinatorClient] COORDINATOR_URL is not set. Coordinator calls will fail.');
}

/**
 * Get fetch function (built-in for Node 18+, or node-fetch as fallback)
 */
async function getFetch() {
  // Use built-in fetch if available (Node 18+)
  if (typeof globalThis.fetch !== 'undefined') {
    return globalThis.fetch;
  }
  
  // Fallback to node-fetch
  try {
    const nodeFetch = await import('node-fetch');
    return nodeFetch.default || nodeFetch;
  } catch (error) {
    throw new Error('fetch is not available. Please use Node.js 18+ or install node-fetch: npm install node-fetch');
  }
}

/**
 * Post envelope to Coordinator with signature
 * @param {Object} envelope - Envelope object with requester_service, payload, response
 * @returns {Promise<Object>} Object with { resp, data }
 */
async function postToCoordinator(envelope) {
  if (!COORDINATOR_URL) {
    throw new Error('COORDINATOR_URL not set');
  }

  const base = String(COORDINATOR_URL).replace(/\/+$/, '');
  const url = `${base}/api/fill-content-metrics/`;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (PRIVATE_KEY) {
    try {
      const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, envelope);
      headers['X-Service-Name'] = SERVICE_NAME;
      headers['X-Signature'] = signature;
    } catch (err) {
      console.warn('[CoordinatorClient] Failed to generate signature:', err.message);
    }
  } else {
    console.warn('[CoordinatorClient] PRIVATE_KEY is not set. Requests will not be signed and Coordinator will likely reject them.');
  }

  const fetchFn = await getFetch();
  const resp = await fetchFn(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(envelope),
  });

  const data = await resp.json().catch(() => ({}));

  const coordinatorName =
    resp.headers.get('x-service-name') || resp.headers.get('X-Service-Name');
  const coordinatorSig =
    resp.headers.get('x-service-signature') || resp.headers.get('X-Service-Signature');

  if (COORDINATOR_PUBLIC_KEY && coordinatorName === 'coordinator' && coordinatorSig) {
    const ok = verifySignature('coordinator', coordinatorSig, COORDINATOR_PUBLIC_KEY, data);
    if (!ok) {
      console.warn('[CoordinatorClient] Invalid Coordinator response signature');
    }
  }

  return { resp, data };
}

export {
  postToCoordinator,
  SERVICE_NAME
};

export default {
  postToCoordinator
};
