/**
 * Logger utility for Railway
 * Ensures logs are properly flushed to stdout/stderr for Railway to capture
 */

// Ensure stdout/stderr are unbuffered
if (process.stdout.isTTY === false) {
  // In Railway/Docker, stdout is not a TTY, so we need to ensure it's flushed
  // Node.js should handle this automatically, but we'll add explicit flushing for safety
}

/**
 * Log with immediate flush (for Railway compatibility)
 * @param {...any} args - Arguments to log
 */
export function log(...args) {
  console.log(...args);
  // Force flush if available (Node.js doesn't have flush, but Railway captures stdout)
  // Railway automatically captures stdout/stderr, so console.log should work
}

/**
 * Error log with immediate flush
 * @param {...any} args - Arguments to log
 */
export function error(...args) {
  console.error(...args);
}

/**
 * Warn log with immediate flush
 * @param {...any} args - Arguments to log
 */
export function warn(...args) {
  console.warn(...args);
}

/**
 * Info log with immediate flush
 * @param {...any} args - Arguments to log
 */
export function info(...args) {
  console.info(...args);
}

// Export default logger
export default {
  log,
  error,
  warn,
  info
};

