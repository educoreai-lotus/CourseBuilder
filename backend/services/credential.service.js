export async function issueCredential(payload = {}) {
  return {
    status: 'issued',
    type: 'credential',
    receivedAt: new Date().toISOString(),
    credentialId: payload.credentialId || `cred_${Date.now()}`,
    recipient: payload.recipient || null
  }
}

export default {
  issueCredential
}
