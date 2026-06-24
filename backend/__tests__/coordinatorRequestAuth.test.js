import {
  buildAuthValidationEnvelope,
  NAUTH_VALIDATION_ACTION,
  validateAccessTokenWithCoordinator
} from '../services/coordinatorRequestAuth.js';
import {
  AUTH_REQUESTER_SERVICE,
  REGISTERED_REQUESTER_SERVICE,
  buildUserFromValidation,
  extractValidationPayload,
  getAuthValidationTimeoutMs,
  getCoordinatorRequestUrl
} from '../utils/authHelpers.js';

describe('buildAuthValidationEnvelope', () => {
  test('matches Content Studio contract shape', () => {
    const envelope = buildAuthValidationEnvelope('jwt-token', '/api/v1/courses?limit=12', 'GET');

    expect(envelope).toEqual({
      requester_service: AUTH_REQUESTER_SERVICE,
      payload: {
        action: NAUTH_VALIDATION_ACTION,
        access_token: 'jwt-token',
        route: '/api/v1/courses?limit=12',
        method: 'GET'
      },
      response: {
        valid: false,
        reason: '',
        auth_state: '',
        directory_user_id: '',
        organization_id: '',
        primary_role: '',
        is_system_admin: false,
        is_trainer: false,
        new_access_token: ''
      }
    });
  });

  test('uses registered Course Builder requester service by default', () => {
    expect(AUTH_REQUESTER_SERVICE).toBe(REGISTERED_REQUESTER_SERVICE);
    expect(REGISTERED_REQUESTER_SERVICE).toBe('course-builder-service');
  });
});

describe('Coordinator URL resolution', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('prefers COORDINATOR_API_URL over COORDINATOR_URL', async () => {
    process.env.COORDINATOR_API_URL = 'https://api.coordinator.test/';
    process.env.COORDINATOR_URL = 'https://legacy.coordinator.test';

    jest.resetModules();
    const helpers = await import('../utils/authHelpers.js');
    expect(helpers.getCoordinatorUrl()).toBe('https://api.coordinator.test/');
    expect(helpers.getCoordinatorRequestUrl()).toBe('https://api.coordinator.test/request');
  });

  test('falls back to COORDINATOR_URL', async () => {
    delete process.env.COORDINATOR_API_URL;
    process.env.COORDINATOR_URL = 'https://coordinator.test/';

    jest.resetModules();
    const helpers = await import('../utils/authHelpers.js');
    expect(helpers.getCoordinatorUrl()).toBe('https://coordinator.test/');
    expect(helpers.getCoordinatorRequestUrl()).toBe('https://coordinator.test/request');
  });
});

describe('extractValidationPayload', () => {
  test('reads response', () => {
    expect(extractValidationPayload({ response: { valid: true } })).toEqual({ valid: true });
  });

  test('reads data.response', () => {
    expect(extractValidationPayload({ data: { response: { valid: true } } })).toEqual({
      valid: true
    });
  });

  test('reads data when valid is present', () => {
    expect(extractValidationPayload({ data: { valid: true, directory_user_id: 'u1' } })).toEqual({
      valid: true,
      directory_user_id: 'u1'
    });
  });

  test('reads top-level valid', () => {
    expect(extractValidationPayload({ valid: false, reason: 'expired' })).toEqual({
      valid: false,
      reason: 'expired'
    });
  });
});

describe('buildUserFromValidation', () => {
  test('supports snake_case and camelCase', () => {
    const user = buildUserFromValidation({
      valid: true,
      directoryUserId: 'dir-1',
      organizationId: 'org-1',
      primaryRole: 'EMPLOYEE',
      isSystemAdmin: false,
      isTrainer: false
    });

    expect(user.directoryUserId).toBe('dir-1');
    expect(user.userId).toBe('dir-1');
    expect(user.id).toBe('dir-1');
    expect(user.organizationId).toBe('org-1');
    expect(user.role).toBe('learner');
    expect(user.source).toBe('coordinator-nauth');
  });
});

describe('validateAccessTokenWithCoordinator', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    process.env.COORDINATOR_URL = 'https://coordinator.test';
    delete process.env.COORDINATOR_API_URL;
    delete process.env.AUTH_REQUESTER_SERVICE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('POSTs to /request with Content-Type application/json only', async () => {
    const { validateAccessTokenWithCoordinator: validate } = await import(
      '../services/coordinatorRequestAuth.js'
    );

    global.fetch.mockResolvedValue({
      ok: true,
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

    await validate('access-token', '/api/v1/courses', 'GET');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://coordinator.test/request');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options.headers.Authorization).toBeUndefined();
    expect(options.headers['X-Service-Name']).toBeUndefined();
  });

  test('returns 401 when validation.valid is not true', async () => {
    const { validateAccessTokenWithCoordinator: validate } = await import(
      '../services/coordinatorRequestAuth.js'
    );

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        response: { valid: false, reason: 'Token expired' }
      })
    });

    await expect(validate('access-token', '/api/v1/courses', 'GET')).rejects.toMatchObject({
      status: 401,
      message: 'Token expired'
    });
  });

  test('throws 503 when Coordinator URL is missing', async () => {
    delete process.env.COORDINATOR_URL;
    delete process.env.COORDINATOR_API_URL;

    const { validateAccessTokenWithCoordinator: validate } = await import(
      '../services/coordinatorRequestAuth.js'
    );

    await expect(validate('access-token', '/api/v1/courses', 'GET')).rejects.toMatchObject({
      status: 503,
      message: 'COORDINATOR_URL_NOT_CONFIGURED'
    });
  });

  test('defaults auth validation timeout to 30000ms', () => {
    delete process.env.AUTH_VALIDATION_TIMEOUT_MS;
    expect(getAuthValidationTimeoutMs()).toBe(30000);
  });
});
