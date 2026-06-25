/**
 * Overwrite legacy localStorage user_id after trusted auth context loads.
 * Do not read user_id as identity source of truth.
 */
export function syncLegacyUserId(directoryUserId) {
  if (typeof window === 'undefined' || !directoryUserId) {
    return;
  }
  window.localStorage.setItem('user_id', String(directoryUserId).trim());
}
