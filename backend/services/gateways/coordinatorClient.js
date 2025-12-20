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

// Cache for keys loaded from files
let cachedPrivateKey = null;
let cachedCoordinatorPublicKey = null;

// Helper functions to get environment variables at runtime (for testing)
function getCoordinatorUrl() {
  return process.env.COORDINATOR_URL;
}

// Load private key from environment or file (with runtime fallback)
function getPrivateKey() {
  // First check environment variable (allows runtime changes for testing)
  if (process.env.PRIVATE_KEY) {
    return process.env.PRIVATE_KEY;
  }
  
  // Fallback to cached value or file
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }
  
  // Try to load from local file (for development)
  const privateKeyPath = path.join(__dirname, '..', '..', 'course-builder-private-key.pem');
  try {
    if (fs.existsSync(privateKeyPath)) {
      cachedPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');
      console.log('[CoordinatorClient] Loaded private key from file');
      return cachedPrivateKey;
    }
  } catch (error) {
    console.warn('[CoordinatorClient] Could not load private key from file:', error.message);
  }
  
  return null;
}

// Load Coordinator public key from environment or file (with runtime fallback)
function getCoordinatorPublicKey() {
  // First check environment variable (allows runtime changes for testing)
  if (process.env.COORDINATOR_PUBLIC_KEY) {
    return process.env.COORDINATOR_PUBLIC_KEY;
  }
  
  // Fallback to cached value or file
  if (cachedCoordinatorPublicKey) {
    return cachedCoordinatorPublicKey;
  }
  
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
      cachedCoordinatorPublicKey = fs.readFileSync(coordinatorKeyPath, 'utf8');
      console.log('[CoordinatorClient] Loaded Coordinator public key from file');
      return cachedCoordinatorPublicKey;
    }
  } catch (error) {
    console.warn('[CoordinatorClient] Could not load Coordinator public key from file:', error.message);
  }
  
  return null;
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
  const coordinatorUrl = getCoordinatorUrl();
  if (!coordinatorUrl) {
    throw new Error('COORDINATOR_URL not set');
  }

  const base = String(coordinatorUrl).replace(/\/+$/, '');
  const url = `${base}/api/fill-content-metrics/`;

  const headers = {
    'Content-Type': 'application/json',
    'X-Service-Name': SERVICE_NAME, // Always set service name
  };

  const privateKey = getPrivateKey();
  if (privateKey) {
    try {
      const signature = generateSignature(SERVICE_NAME, privateKey, envelope);
      headers['X-Signature'] = signature;
    } catch (err) {
      console.warn('[CoordinatorClient] Failed to generate signature:', err.message);
      // X-Service-Name is already set, but signature is missing
    }
  } else {
    console.warn('[CoordinatorClient] PRIVATE_KEY is not set. Requests will not be signed and Coordinator will likely reject them.');
  }

  // ========== LOG REQUEST TO COORDINATOR ==========
  console.log('\n[CoordinatorClient] ========== SENDING REQUEST TO COORDINATOR ==========');
  console.log('[CoordinatorClient] URL:', url);
  console.log('[CoordinatorClient] Method: POST');
  console.log('[CoordinatorClient] Headers:', {
    'Content-Type': headers['Content-Type'],
    'X-Service-Name': headers['X-Service-Name'],
    'X-Signature': headers['X-Signature'] ? `${headers['X-Signature'].substring(0, 20)}...` : 'NOT SET'
  });
  console.log('[CoordinatorClient] Request Body (Envelope):');
  console.log(JSON.stringify(envelope, null, 2));
  console.log('[CoordinatorClient] ===================================================\n');

  const fetchFn = await getFetch();
  
  // Create AbortController for timeout (30 minutes = 1800000ms)
  const CONTENT_STUDIO_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONTENT_STUDIO_TIMEOUT_MS);
  
  try {
    const resp = await fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const data = await resp.json().catch(() => ({}));
    
    // ========== LOG RESPONSE FROM COORDINATOR ==========
    console.log('\n[CoordinatorClient] ========== RECEIVED RESPONSE FROM COORDINATOR ==========');
    console.log('[CoordinatorClient] Status:', resp.status, resp.statusText);
    console.log('[CoordinatorClient] Response Headers:', {
      'x-service-name': resp.headers.get('x-service-name'),
      'x-service-signature': resp.headers.get('x-service-signature') ? 'PRESENT' : 'NOT PRESENT'
    });
    console.log('[CoordinatorClient] Response Body:');
    console.log(JSON.stringify(data, null, 2));
    console.log('[CoordinatorClient] ===================================================\n');
    
    const coordinatorName =
      resp.headers.get('x-service-name') || resp.headers.get('X-Service-Name');
    const coordinatorSig =
      resp.headers.get('x-service-signature') || resp.headers.get('X-Service-Signature');
    
    const coordinatorPublicKey = getCoordinatorPublicKey();
    if (coordinatorPublicKey && coordinatorName === 'coordinator' && coordinatorSig) {
      const ok = verifySignature('coordinator', coordinatorSig, coordinatorPublicKey, data);
      if (!ok) {
        console.warn('[CoordinatorClient] Invalid Coordinator response signature');
      }
    }
    
    return { resp, data };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${CONTENT_STUDIO_TIMEOUT_MS / 1000 / 60} minutes. Content Studio may still be generating content.`);
    }
    throw error;
  }

  const data = await resp.json().catch(() => ({}));

  // ========== LOG RESPONSE FROM COORDINATOR ==========
  console.log('\n[CoordinatorClient] ========== RECEIVED RESPONSE FROM COORDINATOR ==========');
  console.log('[CoordinatorClient] Status:', resp.status, resp.statusText);
  console.log('[CoordinatorClient] Response Headers:', {
    'x-service-name': resp.headers.get('x-service-name'),
    'x-service-signature': resp.headers.get('x-service-signature') ? 'PRESENT' : 'NOT PRESENT'
  });
  console.log('[CoordinatorClient] Response Body:');
  console.log(JSON.stringify(data, null, 2));
  console.log('[CoordinatorClient] ===================================================\n');

  const coordinatorName =
    resp.headers.get('x-service-name') || resp.headers.get('X-Service-Name');
  const coordinatorSig =
    resp.headers.get('x-service-signature') || resp.headers.get('X-Service-Signature');

  const coordinatorPublicKey = getCoordinatorPublicKey();
  if (coordinatorPublicKey && coordinatorName === 'coordinator' && coordinatorSig) {
    const ok = verifySignature('coordinator', coordinatorSig, coordinatorPublicKey, data);
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
