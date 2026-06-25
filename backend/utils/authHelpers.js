/** Registered with Coordinator (registerWithCoordinator.js). */
export const REGISTERED_REQUESTER_SERVICE = 'course-builder-service';

export const AUTH_REQUESTER_SERVICE =
  process.env.AUTH_REQUESTER_SERVICE || REGISTERED_REQUESTER_SERVICE;

export const PUBLIC_ROUTES = [
  { method: 'GET', pattern: /^\/health$/ },
  { method: 'POST', pattern: /^\/api\/fill-content-metrics\/?$/ },
  { method: 'POST', pattern: /^\/api\/v1\/courses\/input\/?$/ },
  { method: 'POST', pattern: /^\/api\/v1\/directory\/trigger-learning-path\/?$/ }
];

export const isProduction = () => process.env.NODE_ENV === 'production';

export const isMockAuthEnabled = () =>
  process.env.ENABLE_MOCK_AUTH === 'true' && !isProduction();

export const isPublicRoute = (req) => {
  if (req.method === 'OPTIONS') {
    return true;
  }

  const path = req.path || req.originalUrl?.split('?')[0] || '';
  return PUBLIC_ROUTES.some(
    ({ method, pattern }) => method === req.method && pattern.test(path)
  );
};

export const isInterServiceRequest = (req) => {
  const serviceName = req.headers['x-service-name'] || req.headers['X-Service-Name'];
  return Boolean(serviceName);
};

export const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ') || authHeader.length <= 7) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token || null;
};

const isTrainerPrimaryRole = (primaryRole) => {
  if (!primaryRole || typeof primaryRole !== 'string') {
    return false;
  }
  const normalized = primaryRole.toLowerCase();
  return normalized === 'trainer' || normalized.includes('trainer');
};

export const mapCompatibilityRole = ({ isSystemAdmin, isTrainer, primaryRole }) => {
  if (isSystemAdmin === true) {
    return 'admin';
  }
  if (isTrainer === true || isTrainerPrimaryRole(primaryRole)) {
    return 'trainer';
  }
  return 'learner';
};

export const buildUserFromValidation = (validation = {}) => {
  const directoryUserId = validation.directory_user_id || validation.directoryUserId || '';
  const organizationId = validation.organization_id || validation.organizationId || '';
  const primaryRole = validation.primary_role || validation.primaryRole || '';
  const isSystemAdmin = Boolean(validation.is_system_admin ?? validation.isSystemAdmin);
  const isTrainer = Boolean(validation.is_trainer ?? validation.isTrainer);
  const role = mapCompatibilityRole({ isSystemAdmin, isTrainer, primaryRole });

  return {
    directoryUserId,
    userId: directoryUserId,
    organizationId,
    primaryRole,
    isSystemAdmin,
    isTrainer,
    role,
    id: directoryUserId,
    source: 'coordinator-nauth'
  };
};

export const getMockUser = () => ({
  directoryUserId: '50a630f4-826e-45aa-8f70-653e5e592fc3',
  userId: '50a630f4-826e-45aa-8f70-653e5e592fc3',
  organizationId: 'mock-org-id',
  primaryRole: 'learner',
  isSystemAdmin: false,
  isTrainer: false,
  role: 'learner',
  id: '50a630f4-826e-45aa-8f70-653e5e592fc3',
  source: 'mock-auth'
});

export const getCoordinatorUrl = () =>
  process.env.COORDINATOR_API_URL || process.env.COORDINATOR_URL || null;

export const getCoordinatorRequestUrl = () => {
  const coordinatorUrl = getCoordinatorUrl();
  if (!coordinatorUrl) {
    return null;
  }
  const cleanCoordinatorUrl = String(coordinatorUrl).replace(/\/+$/, '');
  return `${cleanCoordinatorUrl}/request`;
};

export const getAuthValidationTimeoutMs = () => {
  const parsed = parseInt(process.env.AUTH_VALIDATION_TIMEOUT_MS || '30000', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000;
};

export const extractValidationPayload = (data) => {
  if (!data || typeof data !== 'object') {
    return null;
  }
  if (data.response && typeof data.response === 'object') {
    return data.response;
  }
  if (data.data?.response && typeof data.data.response === 'object') {
    return data.data.response;
  }
  if (data.data && typeof data.data === 'object' && data.data.valid !== undefined) {
    return data.data;
  }
  if (data.valid !== undefined) {
    return data;
  }
  return null;
};

/**
 * Trusted learner identity for learner-owned data (Phase 2A-safe).
 * Uses req.user.directoryUserId only — never body/query/header/path IDs.
 */
export function getAuthenticatedLearnerId(req) {
  const id = req.user?.directoryUserId;
  if (!id || String(id).trim() === '') {
    const error = new Error('Authenticated learner identity is missing');
    error.status = 401;
    throw error;
  }
  return String(id).trim();
}

export function sendAuthIdentityError(res, error) {
  if (!error?.status || error.status !== 401) {
    return false;
  }
  res.status(error.status).json({
    error: 'unauthorized',
    message: error.message
  });
  return true;
}
