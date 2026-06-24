import request from 'supertest';
import app from '../server.js';

describe('Authentication middleware', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK_AUTH = 'false';
    delete process.env.COORDINATOR_URL;
    delete process.env.COORDINATOR_API_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('public routes', () => {
    it('GET /health remains public without Bearer token', async () => {
      const response = await request(app).get('/health').expect(200);
      expect(response.body.status).toBe('healthy');
    });

    it('POST /api/fill-content-metrics remains accessible without user JWT', async () => {
      const response = await request(app)
        .post('/api/fill-content-metrics')
        .send({
          requester_service: 'content_studio',
          payload: { unknown_field: 'value' },
          response: {}
        });

      expect([400, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
    });

    it('POST /api/v1/courses/input remains accessible without user JWT', async () => {
      const response = await request(app)
        .post('/api/v1/courses/input')
        .set('X-Service-Name', 'content-studio')
        .send({
          learner_id: 'learner-xyz',
          learner_name: 'Jane Doe',
          learning_path: [{ topic_name: 'AI Basics' }]
        });

      expect(response.status).not.toBe(401);
    });
  });

  describe('protected routes', () => {
    it('returns 401 when Bearer token is missing on protected route', async () => {
      const response = await request(app).get('/api/v1/courses').expect(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('uses mock auth when ENABLE_MOCK_AUTH=true', async () => {
      process.env.ENABLE_MOCK_AUTH = 'true';

      const response = await request(app).get('/api/v1/courses').expect(200);
      expect(response.body).toHaveProperty('courses');
    });
  });
});

describe('Coordinator auth validation (unit)', () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    process.env.COORDINATOR_URL = 'https://coordinator.test';
    process.env.AUTH_REQUESTER_SERVICE = 'course-builder';
  });

  it('builds req.user from Coordinator validation response', async () => {
    const { validateAccessTokenWithCoordinator } = await import(
      '../services/coordinatorRequestAuth.js'
    );

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          valid: true,
          directory_user_id: 'dir-user-123',
          organization_id: 'org-456',
          primary_role: 'EMPLOYEE',
          is_system_admin: false,
          is_trainer: false,
          new_access_token: 'rotated-token'
        }
      })
    });

    const result = await validateAccessTokenWithCoordinator(
      'access-token',
      '/api/v1/courses',
      'GET'
    );

    expect(result.user.directoryUserId).toBe('dir-user-123');
    expect(result.user.role).toBe('learner');
    expect(result.user.source).toBe('coordinator-nauth');
    expect(result.newAccessToken).toBe('rotated-token');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://coordinator.test/request');
    const body = JSON.parse(options.body);
    expect(body.requester_service).toBe('course-builder');
  });

  it('maps trainer/admin compatibility roles', async () => {
    const { buildUserFromValidation } = await import('../utils/authHelpers.js');

    const trainerUser = buildUserFromValidation({
      valid: true,
      directory_user_id: 'trainer-1',
      primary_role: 'TRAINER',
      is_trainer: true,
      is_system_admin: false
    });
    expect(trainerUser.role).toBe('trainer');

    const adminUser = buildUserFromValidation({
      valid: true,
      directory_user_id: 'admin-1',
      is_system_admin: true
    });
    expect(adminUser.role).toBe('admin');
  });
});

describe('authenticate forwards X-New-Access-Token', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK_AUTH = 'false';
    process.env.COORDINATOR_URL = 'https://coordinator.test';
  });

  it('sets X-New-Access-Token response header when Coordinator returns rotation', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          valid: true,
          directory_user_id: 'user-1',
          organization_id: 'org-1',
          primary_role: 'EMPLOYEE',
          is_system_admin: false,
          is_trainer: false,
          new_access_token: 'fresh-token'
        }
      })
    });

    const response = await request(app)
      .get('/api/v1/courses')
      .set('Authorization', 'Bearer existing-token')
      .expect(200);

    expect(response.headers['x-new-access-token']).toBe('fresh-token');
  });
});

describe('production header bypass', () => {
  it('does not allow X-User-Role to satisfy authorizeRoles in production', async () => {
    const { authorizeRoles } = await import('../middleware/auth.middleware.js');

    const req = {
      method: 'POST',
      path: '/api/v1/courses',
      headers: { 'x-user-role': 'trainer' },
      user: { role: 'learner' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const originalNodeEnv = process.env.NODE_ENV;
    const originalMockAuth = process.env.ENABLE_MOCK_AUTH;
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_MOCK_AUTH = 'false';

    authorizeRoles('trainer', 'admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);

    process.env.NODE_ENV = originalNodeEnv;
    process.env.ENABLE_MOCK_AUTH = originalMockAuth;
  });
});
