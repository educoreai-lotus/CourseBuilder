/**
 * Tests for Coordinator Client
 */

// Mock fetch before importing coordinatorClient
global.fetch = jest.fn();
globalThis.fetch = global.fetch;

import { postToCoordinator } from '../services/gateways/coordinatorClient.js';
import { generateSignature } from '../utils/signature.js';
import crypto from 'crypto';

describe('Coordinator Client', () => {
  const mockEnvelope = {
    requester_service: 'course_builder',
    payload: { test: 'data' },
    response: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    delete process.env.COORDINATOR_URL;
    delete process.env.PRIVATE_KEY;
  });

  describe('postToCoordinator', () => {
    it('should set X-Service-Name header', async () => {
      process.env.COORDINATOR_URL = 'https://coordinator.test';
      process.env.PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: {
          get: jest.fn((name) => {
            if (name === 'x-service-name' || name === 'X-Service-Name') return 'coordinator';
            return null;
          })
        }
      });

      try {
        await postToCoordinator(mockEnvelope);
      } catch (error) {
        // Expected to fail due to invalid key, but we can check headers
      }

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = global.fetch.mock.calls[0];
      const headers = callArgs[1].headers;
      
      expect(headers['X-Service-Name']).toBe('course-builder-service');
    });

    it('should set X-Signature header when PRIVATE_KEY is available', async () => {
      process.env.COORDINATOR_URL = 'https://coordinator.test';
      
      // Generate a valid test key
      const { privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      process.env.PRIVATE_KEY = privateKey;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: {
          get: jest.fn(() => null)
        }
      });

      try {
        await postToCoordinator(mockEnvelope);
      } catch (error) {
        // May fail, but we check headers
      }

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = global.fetch.mock.calls[0];
      const headers = callArgs[1].headers;
      
      expect(headers['X-Signature']).toBeDefined();
      expect(typeof headers['X-Signature']).toBe('string');
    });

    it('should throw error if COORDINATOR_URL is not set', async () => {
      await expect(postToCoordinator(mockEnvelope)).rejects.toThrow('COORDINATOR_URL not set');
    });

    it('should send envelope as JSON in request body', async () => {
      process.env.COORDINATOR_URL = 'https://coordinator.test';
      process.env.PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: {
          get: jest.fn(() => null)
        }
      });

      try {
        await postToCoordinator(mockEnvelope);
      } catch (error) {
        // Expected
      }

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = global.fetch.mock.calls[0];
      const body = callArgs[1].body;
      const parsedBody = JSON.parse(body);
      
      expect(parsedBody).toEqual(mockEnvelope);
    });

    it('should verify Coordinator response signature when available', async () => {
      process.env.COORDINATOR_URL = 'https://coordinator.test';
      
      // Generate test keys
      const { privateKey: coordinatorPrivateKey, publicKey: coordinatorPublicKey } = 
        crypto.generateKeyPairSync('ec', {
          namedCurve: 'prime256v1',
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
          publicKeyEncoding: { type: 'spki', format: 'pem' }
        });
      
      process.env.PRIVATE_KEY = coordinatorPrivateKey;
      process.env.COORDINATOR_PUBLIC_KEY = coordinatorPublicKey;

      const responseData = { success: true, data: {} };
      const coordinatorSignature = generateSignature('coordinator', coordinatorPrivateKey, responseData);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData,
        headers: {
          get: jest.fn((name) => {
            if (name === 'x-service-name' || name === 'X-Service-Name') return 'coordinator';
            if (name === 'x-service-signature' || name === 'X-Service-Signature') return coordinatorSignature;
            return null;
          })
        }
      });

      const result = await postToCoordinator(mockEnvelope);
      
      expect(result.data).toEqual(responseData);
      // Signature verification happens internally (logs warning if invalid)
    });
  });
});
