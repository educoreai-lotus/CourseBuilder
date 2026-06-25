import { jest, describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import { getAuthContext } from '../controllers/auth.controller.js';

const DIRECTORY_USER_ID = 'real-directory-user-id';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

describe('getAuthContext controller', () => {
  it('returns authenticated context from req.user', async () => {
    const req = {
      user: {
        directoryUserId: DIRECTORY_USER_ID,
        userId: DIRECTORY_USER_ID,
        id: DIRECTORY_USER_ID,
        role: 'learner',
        primaryRole: 'REGULAR_EMPLOYEE',
        isTrainer: false,
        isSystemAdmin: false
      }
    };
    const res = createMockRes();
    const next = jest.fn();

    await getAuthContext(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        directoryUserId: DIRECTORY_USER_ID,
        userId: DIRECTORY_USER_ID,
        id: DIRECTORY_USER_ID,
        role: 'learner',
        primaryRole: 'REGULAR_EMPLOYEE',
        isTrainer: false,
        isSystemAdmin: false,
        authenticated: true
      }
    });
    expect(res.body.data).not.toHaveProperty('access_token');
    expect(res.body.data).not.toHaveProperty('token');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when directoryUserId is missing', async () => {
    const req = { user: { role: 'learner' } };
    const res = createMockRes();
    const next = jest.fn();

    await getAuthContext(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'unauthorized',
      message: 'Authenticated learner identity is missing'
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/auth/context route', () => {
  it('is not public without Bearer token', async () => {
    const response = await request(app).get('/api/v1/auth/context').expect(401);

    expect(response.body.error).toBe('unauthorized');
  });
});
