const ALLOWED_UI_ROLES = ['learner', 'trainer'];

/**
 * Map GET /auth/context response to AppContext userProfile fields.
 * Does not invent display names.
 */
export function mapAuthContextToProfile(data = {}) {
  const directoryUserId = data.directoryUserId || data.id || data.userId || null;

  return {
    id: directoryUserId,
    directoryUserId,
    userId: data.userId || directoryUserId,
    role: data.role || 'learner',
    primaryRole: data.primaryRole || '',
    isTrainer: data.isTrainer === true,
    isSystemAdmin: data.isSystemAdmin === true,
    authenticated: data.authenticated === true,
    name: null
  };
}

export function mapAuthContextToUiRole(data = {}) {
  const role = data.role || 'learner';
  if (ALLOWED_UI_ROLES.includes(role)) {
    return role;
  }
  if (role === 'admin' || data.isSystemAdmin === true || data.isTrainer === true) {
    return 'trainer';
  }
  return 'learner';
}
