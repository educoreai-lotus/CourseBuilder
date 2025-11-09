export async function shareMetadata(payload = {}) {
  return {
    status: 'indexed',
    type: 'rag',
    receivedAt: new Date().toISOString(),
    documents: Array.isArray(payload.documents) ? payload.documents.length : 0,
    tags: payload.tags || []
  }
}

export default {
  shareMetadata
}
