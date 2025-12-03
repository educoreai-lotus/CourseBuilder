/**
 * ECDSA P-256 Signature Utility
 * Handles signing and verification for microservice-to-Coordinator communication
 */

import crypto from 'crypto';

/**
 * Build message string for signing
 * Format: educoreai-{serviceName}-{payloadHash}
 * @param {string} serviceName - Name of the service
 * @param {Object} payload - Optional payload object
 * @returns {string} Message string to sign
 */
function buildMessage(serviceName, payload) {
  let message = `educoreai-${serviceName}`;
  if (payload) {
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    message = `${message}-${payloadHash}`;
  }
  return message;
}

/**
 * Generate ECDSA P-256 signature for a message
 * @param {string} serviceName - Name of the service
 * @param {string} privateKeyPem - Private key in PEM format
 * @param {Object} payload - Optional payload object
 * @returns {string} Base64-encoded signature
 * @throws {Error} If serviceName or privateKeyPem is missing
 */
function generateSignature(serviceName, privateKeyPem, payload) {
  if (!serviceName || !privateKeyPem) {
    throw new Error('Missing serviceName or private key for signature');
  }

  const message = buildMessage(serviceName, payload);
  const sign = crypto.createSign('SHA256');
  sign.update(message);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

/**
 * Verify ECDSA P-256 signature
 * @param {string} serviceName - Name of the service that signed
 * @param {string} signature - Base64-encoded signature to verify
 * @param {string} publicKeyPem - Public key in PEM format
 * @param {Object} payload - Optional payload object
 * @returns {boolean} True if signature is valid, false otherwise
 */
function verifySignature(serviceName, signature, publicKeyPem, payload) {
  if (!serviceName || !signature || !publicKeyPem) return false;

  const message = buildMessage(serviceName, payload);
  const verify = crypto.createVerify('SHA256');
  verify.update(message);
  verify.end();
  return verify.verify(publicKeyPem, signature, 'base64');
}

export {
  generateSignature,
  verifySignature,
  buildMessage
};

export default {
  generateSignature,
  verifySignature,
  buildMessage
};
