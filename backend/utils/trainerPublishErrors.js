/**
 * Stable, machine-readable Trainer Publish error codes (INIT/CHUNK/FINALIZE only).
 * Do not use for Full AI or legacy Trainer Publish responses.
 */

export const TRAINER_PUBLISH_ERROR_CODES = Object.freeze({
  TRANSFER_SESSION_GONE: 'TRANSFER_SESSION_GONE',
  TRANSFER_TICKET_INVALID: 'TRANSFER_TICKET_INVALID',
  TRANSFER_METADATA_INVALID: 'TRANSFER_METADATA_INVALID',
  TRANSFER_INCOMPLETE: 'TRANSFER_INCOMPLETE',
  TRANSFER_HASH_MISMATCH: 'TRANSFER_HASH_MISMATCH',
  TRANSFER_SIZE_EXCEEDED: 'TRANSFER_SIZE_EXCEEDED',
  TRAINER_PUBLISH_CONFLICT: 'TRAINER_PUBLISH_CONFLICT',
  TRAINER_PUBLISH_INTERNAL_ERROR: 'TRAINER_PUBLISH_INTERNAL_ERROR',
  TRAINER_PUBLISH_RATE_LIMITED: 'TRAINER_PUBLISH_RATE_LIMITED',
  TRAINER_PUBLISH_UNAUTHORIZED: 'TRAINER_PUBLISH_UNAUTHORIZED'
});

/**
 * @param {number} status
 * @param {string} errorCode
 * @param {string} message - Safe, non-sensitive client message
 * @returns {Error}
 */
export function trainerPublishError(status, errorCode, message) {
  const error = new Error(message);
  error.status = status;
  error.error_code = errorCode;
  error.isTrainerPublishError = true;
  return error;
}

function statusLabel(status) {
  switch (status) {
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 409:
      return 'Conflict';
    case 410:
      return 'Gone';
    case 413:
      return 'Payload Too Large';
    case 429:
      return 'Too Many Requests';
    case 503:
      return 'Service Unavailable';
    case 500:
      return 'Internal Server Error';
    default:
      return 'Bad Request';
  }
}

/**
 * Build JSON body for Trainer Publish handler failures only.
 * Unexpected errors → HTTP 500 + TRAINER_PUBLISH_INTERNAL_ERROR (no raw DB/secrets).
 *
 * @param {unknown} err
 * @param {string} [fallbackMessage]
 * @returns {{ status: number, body: { error: string, error_code: string, message: string } }}
 */
export function buildTrainerPublishErrorResponse(
  err,
  fallbackMessage = 'Trainer Publish request failed'
) {
  const tpErr = err && typeof err === 'object' ? err : null;
  const hasCode =
    tpErr &&
    typeof tpErr.error_code === 'string' &&
    tpErr.error_code.length > 0;
  const hasStatus =
    tpErr && typeof tpErr.status === 'number' && tpErr.status >= 400;

  if (hasCode && hasStatus) {
    const status = tpErr.status;
    return {
      status,
      body: {
        error: statusLabel(status),
        error_code: tpErr.error_code,
        message:
          typeof tpErr.message === 'string' && tpErr.message
            ? tpErr.message
            : fallbackMessage
      }
    };
  }

  // Unexpected / DB / unmarked failures — never 400, never raw internals.
  return {
    status: 500,
    body: {
      error: 'Internal Server Error',
      error_code: TRAINER_PUBLISH_ERROR_CODES.TRAINER_PUBLISH_INTERNAL_ERROR,
      message: 'Trainer Publish request failed due to an internal error'
    }
  };
}

export default {
  TRAINER_PUBLISH_ERROR_CODES,
  trainerPublishError,
  buildTrainerPublishErrorResponse
};
