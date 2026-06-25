import {
  getAuthenticatedLearnerId,
  sendAuthIdentityError
} from '../utils/authHelpers.js';

/**
 * GET /api/v1/auth/context
 * Returns authenticated user context from req.user (no tokens).
 */
export const getAuthContext = async (req, res, next) => {
  try {
    const directoryUserId = getAuthenticatedLearnerId(req);
    const user = req.user || {};

    res.status(200).json({
      success: true,
      data: {
        directoryUserId,
        userId: user.userId || directoryUserId,
        id: user.id || directoryUserId,
        role: user.role || 'learner',
        primaryRole: user.primaryRole || '',
        isTrainer: user.isTrainer === true,
        isSystemAdmin: user.isSystemAdmin === true,
        authenticated: true
      }
    });
  } catch (error) {
    if (sendAuthIdentityError(res, error)) {
      return;
    }
    next(error);
  }
};

export default {
  getAuthContext
};
