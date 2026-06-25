import { isPublicRoute } from '../utils/authHelpers.js';

const mockReq = ({ method = 'GET', path, originalUrl }) => ({
  method,
  path,
  originalUrl: originalUrl ?? path
});

describe('isPublicRoute', () => {
  test('GET /api/v1/courses?limit=12 is NOT public', () => {
    expect(
      isPublicRoute(
        mockReq({
          method: 'GET',
          path: '/api/v1/courses',
          originalUrl: '/api/v1/courses?limit=12'
        })
      )
    ).toBe(false);
  });

  test('GET /api/v1/courses/learners/:learnerId/progress is NOT public', () => {
    expect(
      isPublicRoute(
        mockReq({
          method: 'GET',
          path: '/api/v1/courses/learners/50a630f4-826e-45aa-8f70-653e5e592fc3/progress',
          originalUrl:
            '/api/v1/courses/learners/50a630f4-826e-45aa-8f70-653e5e592fc3/progress'
        })
      )
    ).toBe(false);
  });

  test('GET /health remains public', () => {
    expect(isPublicRoute(mockReq({ method: 'GET', path: '/health' }))).toBe(true);
  });

  test('POST /api/fill-content-metrics remains public (inter-service)', () => {
    expect(
      isPublicRoute(mockReq({ method: 'POST', path: '/api/fill-content-metrics' }))
    ).toBe(true);
  });

  test('POST /api/v1/courses/input remains public (inter-service)', () => {
    expect(
      isPublicRoute(mockReq({ method: 'POST', path: '/api/v1/courses/input' }))
    ).toBe(true);
  });

  test('POST /api/v1/directory/trigger-learning-path remains public', () => {
    expect(
      isPublicRoute(
        mockReq({ method: 'POST', path: '/api/v1/directory/trigger-learning-path' })
      )
    ).toBe(true);
  });

  test('OPTIONS preflight bypasses auth for any path', () => {
    expect(
      isPublicRoute(
        mockReq({
          method: 'OPTIONS',
          path: '/api/v1/courses',
          originalUrl: '/api/v1/courses?limit=12'
        })
      )
    ).toBe(true);
  });

  test('GET /api/v1/courses is NOT public without query string', () => {
    expect(isPublicRoute(mockReq({ method: 'GET', path: '/api/v1/courses' }))).toBe(false);
  });
});

describe('authenticate middleware coordinator path', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    process.env.COORDINATOR_URL = 'https://coordinator.test';
    delete process.env.COORDINATOR_API_URL;
    delete process.env.ENABLE_MOCK_AUTH;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('protected GET /api/v1/courses with Bearer reaches Coordinator validation', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          valid: true,
          directory_user_id: 'user-1',
          organization_id: 'org-1',
          primary_role: 'EMPLOYEE',
          is_system_admin: false,
          is_trainer: false
        }
      })
    });

    const { authenticate } = await import('../middleware/authentication.js');

    const req = {
      method: 'GET',
      path: '/api/v1/courses',
      originalUrl: '/api/v1/courses?limit=12',
      headers: { authorization: 'Bearer test-token' }
    };
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('https://coordinator.test/request');
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user?.directoryUserId).toBe('user-1');
    expect(res.status).not.toHaveBeenCalled();
  });
});
