import {
  extractBearerToken,
  getCoordinatorUrl,
  getMockUser,
  isMockAuthEnabled,
  isPublicRoute
} from '../utils/authHelpers.js';
import { validateAccessTokenWithCoordinator } from '../services/coordinatorRequestAuth.js';

export const authenticate = async (req, res, next) => {
  const route = req.originalUrl || req.path;

  try {
    if (isPublicRoute(req)) {
      return next();
    }

    const accessToken = extractBearerToken(req);
    console.info('[CourseBuilder Auth] Bearer token present:', Boolean(accessToken));

    if (!accessToken) {
      if (isMockAuthEnabled()) {
        req.user = getMockUser();
        return next();
      }

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
        req.user = getMockUser();
        return next();
      }

      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Authentication service is not configured'
      });
    }

    const { user, newAccessToken } = await validateAccessTokenWithCoordinator(
      accessToken,
      route,
      req.method
    );

    req.user = user;

    if (newAccessToken) {
      res.setHeader('X-New-Access-Token', newAccessToken);
    }

    return next();
  } catch (error) {
    const status = error.status || 401;
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
