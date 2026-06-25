import {
  extractBearerToken,
  getCoordinatorUrl,
  getMockUser,
  isMockAuthEnabled,
  isPublicRoute
} from '../utils/authHelpers.js';
import { validateAccessTokenWithCoordinator } from '../services/coordinatorRequestAuth.js';

const AUTH_TRACE = '[CB_AUTH_TRACE_20260625_A]';

export const authenticate = async (req, res, next) => {
  console.log(`${AUTH_TRACE} auth middleware entered`, {
    method: req.method,
    path: req.originalUrl || req.path,
    hasAuthorizationHeader: Boolean(req.headers?.authorization),
    authorizationStartsWithBearer:
      typeof req.headers?.authorization === 'string' &&
      req.headers.authorization.startsWith('Bearer ')
  });

  const route = req.originalUrl || req.path;

  try {
    if (isPublicRoute(req)) {
      console.log(`${AUTH_TRACE} auth public route bypass`, {
        method: req.method,
        path: req.originalUrl || req.path
      });
      return next();
    }

    const accessToken = extractBearerToken(req);
    console.info('[CourseBuilder Auth] Bearer token present:', Boolean(accessToken));

    if (!accessToken) {
      console.log(`${AUTH_TRACE} auth missing bearer branch`, {
        method: req.method,
        path: req.originalUrl || req.path
      });

      if (isMockAuthEnabled()) {
        console.log(`${AUTH_TRACE} auth mock branch used`, {
          method: req.method,
          path: req.originalUrl || req.path,
          nodeEnv: process.env.NODE_ENV || '',
          enableMockAuth: process.env.ENABLE_MOCK_AUTH || ''
        });
        req.user = getMockUser();
        return next();
      }

      console.log(`${AUTH_TRACE} auth failed before controller`, {
        method: req.method,
        path: req.originalUrl || req.path,
        status: 401,
        reason: 'Missing or invalid authorization header'
      });

      return res.status(401).json({
        error: 'unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const coordinatorUrl = getCoordinatorUrl();
    console.info('[CourseBuilder Auth] Coordinator URL configured:', Boolean(coordinatorUrl));

    if (!coordinatorUrl) {
      console.warn(
        '[CourseBuilder Auth] Coordinator URL not configured; cannot validate token for route:',
        route
      );
      if (isMockAuthEnabled()) {
        console.log(`${AUTH_TRACE} auth mock branch used`, {
          method: req.method,
          path: req.originalUrl || req.path,
          nodeEnv: process.env.NODE_ENV || '',
          enableMockAuth: process.env.ENABLE_MOCK_AUTH || ''
        });
        req.user = getMockUser();
        return next();
      }

      console.log(`${AUTH_TRACE} auth failed before controller`, {
        method: req.method,
        path: req.originalUrl || req.path,
        status: 503,
        reason: 'Authentication service is not configured'
      });

      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Authentication service is not configured'
      });
    }

    console.log(`${AUTH_TRACE} auth about to validate with Coordinator`, {
      method: req.method,
      path: req.originalUrl || req.path
    });

    const { user, newAccessToken, validation } = await validateAccessTokenWithCoordinator(
      accessToken,
      route,
      req.method
    );

    console.log(`${AUTH_TRACE} auth Coordinator validation returned`, {
      method: req.method,
      path: req.originalUrl || req.path,
      valid: validation?.valid === true,
      hasDirectoryUserIdSnake: Boolean(validation?.directory_user_id),
      hasDirectoryUserIdCamel: Boolean(validation?.directoryUserId),
      authState: validation?.auth_state || validation?.authState || ''
    });

    req.user = user;

    console.log(`${AUTH_TRACE} auth assigned req.user`, {
      method: req.method,
      path: req.originalUrl || req.path,
      hasReqUser: Boolean(req.user),
      hasDirectoryUserId: Boolean(req.user?.directoryUserId),
      hasUserId: Boolean(req.user?.userId),
      hasId: Boolean(req.user?.id),
      role: req.user?.role || '',
      primaryRole: req.user?.primaryRole || ''
    });

    console.info('[CourseBuilder Auth Debug] assigned req.user identity:', {
      hasDirectoryUserId: Boolean(req.user?.directoryUserId),
      hasUserId: Boolean(req.user?.userId),
      hasId: Boolean(req.user?.id),
      hasOrganizationId: Boolean(req.user?.organizationId),
      primaryRole: req.user?.primaryRole || '',
      role: req.user?.role || '',
      isTrainer: req.user?.isTrainer === true,
      isSystemAdmin: req.user?.isSystemAdmin === true
    });

    if (newAccessToken) {
      res.setHeader('X-New-Access-Token', newAccessToken);
    }

    return next();
  } catch (error) {
    const status = error.status || 401;

    console.log(`${AUTH_TRACE} auth failed before controller`, {
      method: req.method,
      path: req.originalUrl || req.path,
      status,
      reason: error.message || ''
    });

    if (status === 401) {
      console.warn('[CourseBuilder Auth] Token validation failed:', {
        route,
        reason: error.message || 'unauthorized'
      });
      return res.status(401).json({
        error: 'unauthorized',
        message: error.message || 'Invalid or expired token'
      });
    }

    if (status === 503 || error.message === 'COORDINATOR_URL_NOT_CONFIGURED') {
      console.warn('[CourseBuilder Auth] Authentication service unavailable:', {
        route,
        reason: error.message
      });
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Authentication service is unavailable'
      });
    }

    console.error('[CourseBuilder Auth] Unexpected auth error:', error.message);
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token'
    });
  }
};

export default authenticate;
