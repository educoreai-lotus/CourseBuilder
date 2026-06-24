import {
  AUTH_REQUESTER_SERVICE,
  buildUserFromValidation,
  extractValidationPayload,
  getAuthValidationTimeoutMs,
  getCoordinatorUrl
} from '../utils/authHelpers.js';

const buildValidationEnvelope = (accessToken, route, method) => ({
  requester_service: AUTH_REQUESTER_SERVICE,
  payload: {
    action:
      'Route this request to nAuth service only for access token validation and session continuity decision.',
    access_token: accessToken,
    route,
    method
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

/**
 * Validate access token through Coordinator → nAuth.
 * @returns {Promise<{ user: object, newAccessToken: string|null }>}
 */
export async function validateAccessTokenWithCoordinator(accessToken, route, method) {
  const coordinatorUrl = getCoordinatorUrl();
  if (!coordinatorUrl) {
    throw new Error('COORDINATOR_URL_NOT_CONFIGURED');
  }

  const base = String(coordinatorUrl).replace(/\/+$/, '');
  const url = `${base}/request`;
  const envelope = buildValidationEnvelope(accessToken, route, method);
  const timeoutMs = getAuthValidationTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || data.error || 'Coordinator auth validation failed');
      error.status = response.status;
      throw error;
    }

    const validation = extractValidationPayload(data);
    if (!validation || validation.valid !== true) {
      const error = new Error(validation?.reason || 'Invalid or expired access token');
      error.status = 401;
      throw error;
    }

    const newAccessToken =
      validation.new_access_token || validation.newAccessToken || data.new_access_token || null;

    return {
      user: buildUserFromValidation(validation),
      newAccessToken: newAccessToken || null
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Authentication validation timed out');
      timeoutError.status = 503;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default {
  validateAccessTokenWithCoordinator
};
