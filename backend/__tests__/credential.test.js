/**
 * Tests for Credential Service
 */

import { jest } from '@jest/globals';
import { issueCredential, revokeCredential } from '../services/credential.service.js';
import axios from 'axios';

jest.mock('axios');

describe('Credential Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CREDLY_API_KEY = 'test-api-key';
    process.env.CREDLY_API_URL = 'https://api.credly.com/v1';
  });

  afterEach(() => {
    delete process.env.CREDLY_API_KEY;
    delete process.env.CREDLY_API_URL;
  });

  describe('issueCredential', () => {
    it('should issue credential successfully', async () => {
      const mockResponse = {
        data: {
          id: 'credential-123',
          badge_url: 'https://credly.com/badge/123',
          issued_at: new Date().toISOString()
        }
      };

      axios.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await issueCredential({
        learnerId: 'learner-1',
        learnerName: 'John Doe',
        learnerEmail: 'john@example.com',
        courseId: 'course-1',
        courseName: 'Test Course',
        score: 85,
        completedAt: new Date()
      });

      expect(result.success).toBe(true);
      expect(result.credentialId).toBe('credential-123');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/credential_batches'),
        expect.objectContaining({
          credential: expect.objectContaining({
            recipient_email: 'john@example.com',
            issued_to_first_name: 'John'
          })
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
    });

    it('should handle missing email gracefully', async () => {
      const result = await issueCredential({
        learnerId: 'learner-1',
        learnerName: 'John Doe',
        learnerEmail: null,
        courseId: 'course-1',
        courseName: 'Test Course',
        score: 85,
        completedAt: new Date()
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('no_email');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      axios.post = jest.fn().mockRejectedValue(new Error('API Error'));

      const result = await issueCredential({
        learnerId: 'learner-1',
        learnerName: 'John Doe',
        learnerEmail: 'john@example.com',
        courseId: 'course-1',
        courseName: 'Test Course',
        score: 85,
        completedAt: new Date()
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should skip when Credly is not configured', async () => {
      delete process.env.CREDLY_API_KEY;

      const result = await issueCredential({
        learnerId: 'learner-1',
        learnerName: 'John Doe',
        learnerEmail: 'john@example.com',
        courseId: 'course-1',
        courseName: 'Test Course',
        score: 85,
        completedAt: new Date()
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Credly API not configured');
    });
  });

  describe('revokeCredential', () => {
    it('should revoke credential successfully', async () => {
      axios.delete = jest.fn().mockResolvedValue({ data: {} });

      const result = await revokeCredential('credential-123');

      expect(result.success).toBe(true);
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/credential_batches/credential-123'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
    });

    it('should handle revocation errors', async () => {
      axios.delete = jest.fn().mockRejectedValue(new Error('Revocation failed'));

      const result = await revokeCredential('credential-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Revocation failed');
    });
  });
});

