/**
 * Tests for OAuth2 Middleware
 */

import { jest } from '@jest/globals';
import { getOAuth2Token, validateAndRefreshToken, getOAuth2Config } from '../middleware/oauth2.middleware.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';

jest.mock('axios');
jest.mock('jsonwebtoken');

describe('OAuth2 Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOAuth2Token', () => {
    it('should get OAuth2 token from authorization server', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'read write'
        }
      };

      axios.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await getOAuth2Token(
        'client-id',
        'client-secret',
        'https://auth.example.com/token',
        ['read', 'write']
      );

      expect(result.access_token).toBe('test-token');
      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBe(3600);
      expect(axios.post).toHaveBeenCalledWith(
        'https://auth.example.com/token',
        expect.any(URLSearchParams),
        expect.any(Object)
      );
    });

    it('should handle token request errors', async () => {
      axios.post = jest.fn().mockRejectedValue(new Error('Auth server error'));

      await expect(
        getOAuth2Token('client-id', 'secret', 'https://auth.example.com/token')
      ).rejects.toThrow('Auth server error');
    });
  });

  describe('validateAndRefreshToken', () => {
    it('should return valid token if not expired', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      jwt.decode = jest.fn().mockReturnValue({
        exp: futureExp
      });

      const result = await validateAndRefreshToken('valid-token', {
        clientId: 'client-id',
        clientSecret: 'secret',
        tokenUrl: 'https://auth.example.com/token',
        scopes: []
      });

      expect(result.access_token).toBe('valid-token');
      expect(result.expires_at).toBeInstanceOf(Date);
    });

    it('should refresh token if expiring soon', async () => {
      const nearExp = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
      jwt.decode = jest.fn().mockReturnValue({
        exp: nearExp
      });

      axios.post = jest.fn().mockResolvedValue({
        data: {
          access_token: 'new-token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      });

      const result = await validateAndRefreshToken('expiring-token', {
        clientId: 'client-id',
        clientSecret: 'secret',
        tokenUrl: 'https://auth.example.com/token',
        scopes: []
      });

      expect(result.access_token).toBe('new-token');
      expect(axios.post).toHaveBeenCalled(); // Should refresh
    });
  });

  describe('getOAuth2Config', () => {
    it('should return config when environment variables set', () => {
      process.env.OAUTH2_CLIENT_ID = 'client-id';
      process.env.OAUTH2_CLIENT_SECRET = 'secret';
      process.env.OAUTH2_TOKEN_URL = 'https://auth.example.com/token';
      process.env.OAUTH2_SCOPES = 'read,write';

      const config = getOAuth2Config();

      expect(config).toEqual({
        clientId: 'client-id',
        clientSecret: 'secret',
        tokenUrl: 'https://auth.example.com/token',
        scopes: ['read', 'write']
      });
    });

    it('should return null when not configured', () => {
      delete process.env.OAUTH2_CLIENT_ID;
      delete process.env.OAUTH2_CLIENT_SECRET;
      delete process.env.OAUTH2_TOKEN_URL;

      const config = getOAuth2Config();

      expect(config).toBeNull();
    });
  });
});

