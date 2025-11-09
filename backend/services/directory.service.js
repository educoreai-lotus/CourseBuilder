export async function handleFeedbackSync(payload = {}) {
  return {
    status: 'synced',
    type: 'directory',
    receivedAt: new Date().toISOString(),
    entries: Array.isArray(payload.feedback) ? payload.feedback.length : 0
  }
}

export default {
  handleFeedbackSync
}
