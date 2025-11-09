import { handleContentData } from '../services/contentStudio.service.js'
import { handleAssessmentReport } from '../services/assessment.service.js'
import { handleLearningAnalytics } from '../services/analytics.service.js'
import { handleFeedbackSync } from '../services/directory.service.js'
import { issueCredential } from '../services/credential.service.js'
import { shareMetadata } from '../services/rag.service.js'

const serviceHandlers = {
  content_studio: handleContentData,
  assessment: handleAssessmentReport,
  analytics: handleLearningAnalytics,
  directory: handleFeedbackSync,
  credential: issueCredential,
  rag: shareMetadata
}

const resolveService = (req) => {
  const headerService = req.headers['x-source-service'] || req.headers['x-service-name']
  const service = headerService || req.query.service || req.body?.service
  return typeof service === 'string' ? service.toLowerCase() : ''
}

export async function handleIntegrationRequest(req, res) {
  const service = resolveService(req)

  if (!service) {
    return res.status(400).json({
      success: false,
      service: null,
      message: 'Service identifier is required',
      error: 'missing_service'
    })
  }

  const handler = serviceHandlers[service]

  if (!handler) {
    return res.status(400).json({
      success: false,
      service,
      message: 'Unsupported integration service',
      error: 'unsupported_service'
    })
  }

  try {
    const data = await handler(req.body || {})

    return res.status(200).json({
      success: true,
      service,
      message: 'Processed successfully',
      data: data ?? null
    })
  } catch (error) {
    console.error(`Integration handler error for ${service}:`, error)
    return res.status(500).json({
      success: false,
      service,
      message: 'Failed to process integration request',
      error: error.message || 'internal_error'
    })
  }
}

export default {
  handleIntegrationRequest
}
