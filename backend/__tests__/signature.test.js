/**
 * Tests for signature utility functions
 */

import { generateSignature, verifySignature, buildMessage } from '../utils/signature.js';
import crypto from 'crypto';

describe('Signature Utility', () => {
  // Generate test key pair
  let privateKeyPem;
  let publicKeyPem;

  beforeAll(() => {
    // Generate ECDSA P-256 key pair for testing
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    privateKeyPem = privateKey;
    publicKeyPem = publicKey;
  });

  describe('buildMessage', () => {
    it('should build message with service name only', () => {
      const message = buildMessage('test-service', null);
      expect(message).toBe('educoreai-test-service');
    });

    it('should build message with service name and payload hash', () => {
      const payload = { test: 'data' };
      const message = buildMessage('test-service', payload);
      expect(message).toMatch(/^educoreai-test-service-[a-f0-9]{64}$/);
    });

    it('should produce same hash for same payload', () => {
      const payload = { test: 'data' };
      const message1 = buildMessage('test-service', payload);
      const message2 = buildMessage('test-service', payload);
      expect(message1).toBe(message2);
    });

    it('should produce different hash for different payloads', () => {
      const payload1 = { test: 'data1' };
      const payload2 = { test: 'data2' };
      const message1 = buildMessage('test-service', payload1);
      const message2 = buildMessage('test-service', payload2);
      expect(message1).not.toBe(message2);
    });
  });

  describe('generateSignature', () => {
    it('should generate a valid signature', () => {
      const serviceName = 'test-service';
      const payload = { test: 'data' };
      
      const signature = generateSignature(serviceName, privateKeyPem, payload);
      
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should throw error if serviceName is missing', () => {
      expect(() => {
        generateSignature(null, privateKeyPem, {});
      }).toThrow('Missing serviceName or private key for signature');
    });

    it('should throw error if privateKey is missing', () => {
      expect(() => {
        generateSignature('test-service', null, {});
      }).toThrow('Missing serviceName or private key for signature');
    });

    it('should generate same signature for same input', () => {
      const serviceName = 'test-service';
      const payload = { test: 'data' };
      
      const signature1 = generateSignature(serviceName, privateKeyPem, payload);
      const signature2 = generateSignature(serviceName, privateKeyPem, payload);
      
      expect(signature1).toBe(signature2);
    });

    it('should generate different signature for different payloads', () => {
      const serviceName = 'test-service';
      const payload1 = { test: 'data1' };
      const payload2 = { test: 'data2' };
      
      const signature1 = generateSignature(serviceName, privateKeyPem, payload1);
      const signature2 = generateSignature(serviceName, privateKeyPem, payload2);
      
      expect(signature1).not.toBe(signature2);
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const serviceName = 'test-service';
      const payload = { test: 'data' };
      
      const signature = generateSignature(serviceName, privateKeyPem, payload);
      const isValid = verifySignature(serviceName, signature, publicKeyPem, payload);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const serviceName = 'test-service';
      const payload = { test: 'data' };
      const invalidSignature = 'invalid-signature-base64';
      
      const isValid = verifySignature(serviceName, invalidSignature, publicKeyPem, payload);
      
      expect(isValid).toBe(false);
    });

    it('should reject signature when payload changes', () => {
      const serviceName = 'test-service';
      const originalPayload = { test: 'data1' };
      const modifiedPayload = { test: 'data2' };
      
      const signature = generateSignature(serviceName, privateKeyPem, originalPayload);
      const isValid = verifySignature(serviceName, signature, publicKeyPem, modifiedPayload);
      
      expect(isValid).toBe(false);
    });

    it('should return false if serviceName is missing', () => {
      const signature = generateSignature('test-service', privateKeyPem, {});
      const isValid = verifySignature(null, signature, publicKeyPem, {});
      expect(isValid).toBe(false);
    });

    it('should return false if signature is missing', () => {
      const isValid = verifySignature('test-service', null, publicKeyPem, {});
      expect(isValid).toBe(false);
    });

    it('should return false if publicKey is missing', () => {
      const signature = generateSignature('test-service', privateKeyPem, {});
      const isValid = verifySignature('test-service', signature, null, {});
      expect(isValid).toBe(false);
    });
  });

  describe('Integration: Generate and Verify', () => {
    it('should generate and verify signature for course-builder-service', () => {
      const serviceName = 'course-builder-service';
      const payload = {
        requester_service: 'course_builder',
        payload: { learner_id: '123', skills: ['react'] },
        response: {}
      };
      
      const signature = generateSignature(serviceName, privateKeyPem, payload);
      const isValid = verifySignature(serviceName, signature, publicKeyPem, payload);
      
      expect(isValid).toBe(true);
    });

    it('should detect tampering when payload is modified', () => {
      const serviceName = 'course-builder-service';
      const originalPayload = {
        requester_service: 'course_builder',
        payload: { learner_id: '123', skills: ['react'] },
        response: {}
      };
      const tamperedPayload = {
        requester_service: 'course_builder',
        payload: { learner_id: '456', skills: ['react'] }, // Changed learner_id
        response: {}
      };
      
      const signature = generateSignature(serviceName, privateKeyPem, originalPayload);
      const isValid = verifySignature(serviceName, signature, publicKeyPem, tamperedPayload);
      
      expect(isValid).toBe(false);
    });
  });
});
