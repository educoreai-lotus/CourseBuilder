export async function handleContentData(payload = {}) {
  return {
    status: 'received',
    type: 'content_studio',
    receivedAt: new Date().toISOString(),
    summary: {
      blocks: Array.isArray(payload.blocks) ? payload.blocks.length : 0,
      topics: Array.isArray(payload.topics) ? payload.topics.length : 0
    }
  }
}

export default {
  handleContentData
}
