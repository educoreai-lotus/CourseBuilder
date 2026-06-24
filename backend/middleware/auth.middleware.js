import { authenticate as authenticateMiddleware } from './authentication.js';
import {
  isInterServiceRequest,
  isMockAuthEnabled,
  isProduction,
  isPublicRoute
} from '../utils/authHelpers.js';

export const authenticateRequest = authenticateMiddleware;

export const authorizeRoles =
  (...roles) =>
  (req, res, next) => {
    if (roles.length === 0) {
      return next();
    }

    if (isPublicRoute(req)) {
      return next();
    }

    if (roles.includes('service') && isInterServiceRequest(req)) {
      req.user = {
        ...(req.user || {}),
        role: 'service',
        source: req.user?.source || 'inter-service'
      };
      return next();
    }

    if (isMockAuthEnabled() && !isProduction()) {
      if (!req.user) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'User role is missing from token'
        });
      }
      if (roles.includes('*') || roles.includes(req.user.role)) {
        return next();
      }
      return res.status(403).json({
        error: 'forbidden',
        message: 'Insufficient role permissions'
      });
    }

    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'User role is missing from token'
      });
    }

    if (roles.includes('*') || roles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      error: 'forbidden',
      message: 'Insufficient role permissions'
    });
  };

export const requireScopes =
  (...requiredScopes) =>
  (req, res, next) => {
    if (isPublicRoute(req) || requiredScopes.length === 0) {
      return next();
    }

    if (isMockAuthEnabled() && !isProduction()) {
      return next();
    }

    const scopes = req.user?.scopes || [];
    const hasScopes = requiredScopes.every((scope) => scopes.includes(scope));

    if (!hasScopes) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Required scopes are missing'
      });
    }

    return next();
  };
