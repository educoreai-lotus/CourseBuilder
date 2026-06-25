import {
  AUTH_REQUESTER_SERVICE,
  buildUserFromValidation,
  extractValidationPayload,
  getAuthValidationTimeoutMs,
  getCoordinatorRequestUrl
} from '../utils/authHelpers.js';

/** Must match Content Studio / Coordinator nAuth routing contract. */
export const NAUTH_VALIDATION_ACTION =
  'Route this request to nAuth service only for access token validation and session continuity decision.';

const AUTH_VALIDATION_RESPONSE_TEMPLATE = {
  valid: false,
  reason: '',
  auth_state: '',
  directory_user_id: '',
  organization_id: '',
  primary_role: '',
  is_system_admin: false,
  is_trainer: false,
  new_access_token: ''
};

/**
 * Build Coordinator validation envelope (Content Studio contract).
 */
export function buildAuthValidationEnvelope(accessToken, route, method) {
  return {
    requester_service: AUTH_REQUESTER_SERVICE,
    payload: {
      action: NAUTH_VALIDATION_ACTION,
      access_token: accessToken,
      route,
      method
    },
    response: { ...AUTH_VALIDATION_RESPONSE_TEMPLATE }
  };
}

/**
 * Validate access token through Coordinator → nAuth.
 * @returns {Promise<{ user: object, newAccessToken: string|null }>}
 */
export async function validateAccessTokenWithCoordinator(accessToken, route, method) {
  const url = getCoordinatorRequestUrl();
  if (!url) {
    const error = new Error('COORDINATOR_URL_NOT_CONFIGURED');
    error.status = 503;
    throw error;
  }

  const envelope = buildAuthValidationEnvelope(accessToken, route, method);
  const timeoutMs = getAuthValidationTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  console.info('[CourseBuilder Auth] Coordinator auth validation start:', { route, method });
  console.info('[CourseBuilder Auth] requester_service:', AUTH_REQUESTER_SERVICE);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    console.info('[CourseBuilder Auth Debug] coordinator raw shape:', {
      hasTopLevelResponse: Boolean(data?.response),
      hasDataResponse: Boolean(data?.data?.response),
      hasTopLevelValid: typeof data?.valid !== 'undefined',
      topLevelKeys: data && typeof data === 'object' ? Object.keys(data) : []
    });

    if (!response.ok) {
      console.warn('[CourseBuilder Auth] Coordinator HTTP error:', {
        route,
        status: response.status
      });
      const error = new Error(data.message || data.error || 'Coordinator auth validation failed');
      error.status = response.status >= 500 ? 503 : 401;
      throw error;
    }

    const validation = extractValidationPayload(data);

    console.info('[CourseBuilder Auth Debug] extracted validation:', {
      valid: validation?.valid === true,
      authState: validation?.auth_state || validation?.authState || '',
      hasDirectoryUserIdSnake: Boolean(validation?.directory_user_id),
      hasDirectoryUserIdCamel: Boolean(validation?.directoryUserId),
      hasOrganizationIdSnake: Boolean(validation?.organization_id),
      hasPrimaryRoleSnake: Boolean(validation?.primary_role),
      hasNewAccessToken: Boolean(validation?.new_access_token || validation?.newAccessToken),
      validationKeys:
        validation && typeof validation === 'object' ? Object.keys(validation) : []
    });

    const isValid = validation?.valid === true;
    console.info('[CourseBuilder Auth] Coordinator validation received:', {
      route,
      valid: isValid
    });

    if (!isValid) {
      const reason = validation?.reason || 'Invalid or expired access token';
      console.warn('[CourseBuilder Auth] Token validation failed:', { route, reason });
      const error = new Error(reason);
      error.status = 401;
      throw error;
    }

    const newAccessToken =
      validation.new_access_token || validation.newAccessToken || data.new_access_token || null;

    const user = buildUserFromValidation(validation);

    console.info('[CourseBuilder Auth Debug] built req.user identity:', {
      hasDirectoryUserId: Boolean(user?.directoryUserId),
      hasUserId: Boolean(user?.userId),
      hasId: Boolean(user?.id),
      hasOrganizationId: Boolean(user?.organizationId),
      primaryRole: user?.primaryRole || '',
      role: user?.role || '',
      isTrainer: user?.isTrainer === true,
      isSystemAdmin: user?.isSystemAdmin === true
    });

    return {
      user,
      newAccessToken: newAccessToken || null
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('[CourseBuilder Auth] Coordinator validation timed out:', { route });
      const timeoutError = new Error('Authentication validation timed out');
      timeoutError.status = 503;
      throw timeoutError;
    }
    if (!error.status) {
      console.warn('[CourseBuilder Auth] Coordinator validation network error:', {
        route,
        message: error.message
      });
      error.status = 503;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default {
  buildAuthValidationEnvelope,
  validateAccessTokenWithCoordinator
};
