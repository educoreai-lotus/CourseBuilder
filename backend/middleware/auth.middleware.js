import jwt from 'jsonwebtoken';

const DEFAULT_PUBLIC_ROUTES = [
  { method: 'GET', pattern: /^\/health$/ },
  { method: 'OPTIONS', pattern: /.*/ }
];

const isSecurityDisabled = () =>
  process.env.AUTH_DISABLED === 'true' || process.env.NODE_ENV === 'test';

const isPublicRoute = (req) => {
  return DEFAULT_PUBLIC_ROUTES.some(
    ({ method, pattern }) =>
      (method === req.method || method === 'OPTIONS') && pattern.test(req.path)
  );
};

export const authenticateRequest = (req, res, next) => {
  if (isSecurityDisabled() || isPublicRoute(req)) {
    return next();
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid authorization header'
    });
  }

  const token = authHeader.slice(7);
  const secret = process.env.AUTH_JWT_SECRET;
  const issuer = process.env.AUTH_ISSUER;
  const audience = process.env.AUTH_AUDIENCE;

  if (!secret) {
    console.warn('[Auth] AUTH_JWT_SECRET is not configured; rejecting request');
    return res.status(500).json({
      error: 'configuration_error',
      message: 'Authentication service misconfiguration'
    });
  }

  try {
    const payload = jwt.verify(token, secret, {
      issuer: issuer || undefined,
      audience: audience || undefined
    });

    const scopesString = payload.scope || payload.scopes || '';
    const scopes = Array.isArray(scopesString)
      ? scopesString
      : scopesString.split(' ').filter(Boolean);

    req.user = {
      id: payload.sub || payload.user_id || null,
      role: payload.role || payload.roles || payload['https://coursebuilder.dev/role'],
      scopes,
      payload
    };

    if (!req.user.role) {
      req.user.role = Array.isArray(payload.roles) ? payload.roles[0] : 'learner';
    }

    return next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token'
    });
  }
};

export const authorizeRoles = (...roles) => (req, res, next) => {
  if (isSecurityDisabled() || roles.length === 0) {
    return next();
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

export const requireScopes = (...requiredScopes) => (req, res, next) => {
  if (isSecurityDisabled() || requiredScopes.length === 0) {
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



