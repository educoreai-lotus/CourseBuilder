import {
  extractBearerToken,
  getCoordinatorUrl,
  getMockUser,
  isMockAuthEnabled,
  isPublicRoute
} from '../utils/authHelpers.js';
import { validateAccessTokenWithCoordinator } from '../services/coordinatorRequestAuth.js';

export const authenticate = async (req, res, next) => {
  try {
    if (isPublicRoute(req)) {
      return next();
    }

    const accessToken = extractBearerToken(req);

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
    if (!coordinatorUrl) {
      if (isMockAuthEnabled()) {
        req.user = getMockUser();
        return next();
      }

      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Authentication service is not configured'
      });
    }

    const route = req.originalUrl || req.path;
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
      return res.status(401).json({
        error: 'unauthorized',
        message: error.message || 'Invalid or expired token'
      });
    }

    if (status === 503 || error.message === 'COORDINATOR_URL_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Authentication service is unavailable'
      });
    }

    console.error('[Auth] Token validation failed:', error.message);
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token'
    });
  }
};

export default authenticate;
