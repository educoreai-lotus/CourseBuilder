/**
 * Unified Integration Controller
 * Handles all integration requests through single endpoint: POST /api/fill-content-metrics
 * Implements strict stringified JSON request/response contract.
 */

import { dispatchIntegrationRequest } from '../integration/dispatcher.js';

/**
 * Normalize service name to internal format
 * Supports both serviceName and requester_service for backward compatibility
 */
function normalizeServiceName(serviceName) {
  if (!serviceName) return null;
  
  const key = String(serviceName).trim();
  
  // Direct match (case-insensitive)
  const directMatch = {
    'ContentStudio': 'ContentStudio',
    'LearnerAI': 'LearnerAI',
    'Assessment': 'Assessment',
    'SkillsEngine': 'SkillsEngine',
    'Directory': 'Directory',
    'LearningAnalytics': 'LearningAnalytics',
    'ManagementReporting': 'ManagementReporting',
    'Devlab': 'Devlab',
    'DevLab': 'Devlab'
  };
  
  if (directMatch[key]) return directMatch[key];
  
  // Kebab-case and lowercase variants
  const normalized = key.toLowerCase();
  const mapping = {
    'content-studio': 'ContentStudio',
    'contentstudio': 'ContentStudio',
    'learner-ai': 'LearnerAI',
    'learnerai': 'LearnerAI',
    'assessment': 'Assessment',
    'skills-engine': 'SkillsEngine',
    'skillsengine': 'SkillsEngine',
    'directory': 'Directory',
    'learning-analytics': 'LearningAnalytics',
    'learninganalytics': 'LearningAnalytics',
    'management-reporting': 'ManagementReporting',
    'managementreporting': 'ManagementReporting',
    'devlab': 'Devlab',
    'dev-lab': 'Devlab'
  };
  
  return mapping[normalized] || null;
}

/**
 * Unified integration endpoint handler
 * POST /api/fill-content-metrics
 *
 * Contract rules:
 * 1) Request body is a stringified JSON (Express JSON parser will yield a string)
 * 2) Parse with JSON.parse to object: must contain serviceName (string), payload (stringified JSON string), response (stringified JSON string)
 * 3) Parse both payload and response strings to objects
 * 4) Route by serviceName, pass parsed payload and response template to handler
 * 5) Handler fills the response template and returns it
 * 6) Stringify response back and return the full envelope as stringified JSON
 * 7) On parse/validation error: respond 400 with stringified JSON error
 */
export async function handleFillContentMetrics(req, res) {
  try {
    // Body may arrive as:
    // 1. A string (stringified JSON) - if Express.json() middleware is not used or body is sent as text
    // 2. An object (already parsed by Express.json() middleware)
    let envelope;
    if (typeof req.body === 'string') {
      // Body is a string - parse it
      try {
        envelope = JSON.parse(req.body);
      } catch (parseError) {
        const errorPayload = {
          error: 'Bad Request',
          message: 'Failed to parse request body as JSON',
          details: parseError.message
        };
        res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
      }
    } else if (typeof req.body === 'object' && req.body !== null) {
      // Body is already parsed by Express.json() - use it directly
      envelope = req.body;
    } else {
      // Invalid body type
      const errorPayload = {
        error: 'Bad Request',
        message: 'Request body must be a valid JSON object or stringified JSON'
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Validate required fields and structure
    // Support both serviceName and requester_service for backward compatibility
    const serviceNameInput = envelope.serviceName || envelope.requester_service;
    const hasServiceName = typeof serviceNameInput === 'string' && serviceNameInput.trim().length > 0;
    const hasPayload = envelope.payload && typeof envelope.payload === 'string';
    const hasResponse = envelope.response && typeof envelope.response === 'string';

    if (!hasServiceName || !hasPayload || !hasResponse) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Envelope must include "serviceName" (string), "payload" (stringified JSON string), and "response" (stringified JSON string)'
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Normalize service name to internal format
    const serviceName = normalizeServiceName(serviceNameInput);
    if (!serviceName) {
      const errorPayload = {
        error: 'Bad Request',
        message: `Unsupported serviceName: ${serviceNameInput}`
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }
    
    // Ensure envelope has serviceName (normalize from requester_service if needed)
    envelope.serviceName = serviceName;

    // Parse payload (it's a stringified JSON)
    let payloadObject;
    try {
      payloadObject = JSON.parse(envelope.payload);
    } catch (parseError) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Failed to parse payload as JSON',
        details: parseError.message
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Parse response (it's a stringified JSON)
    let responseObject;
    try {
      responseObject = JSON.parse(envelope.response);
    } catch (parseError) {
      const errorPayload = {
        error: 'Bad Request',
        message: 'Failed to parse response as JSON',
        details: parseError.message
      };
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send(JSON.stringify(errorPayload));
    }

    // Call dispatcher with serviceName, payload, and response template
    const filledResponse = await dispatchIntegrationRequest(serviceName, payloadObject, responseObject);

    // Handler returns the filled response object
    // Stringify response back to string
    envelope.response = JSON.stringify(filledResponse);
    
    // Ensure serviceName is in the response envelope
    envelope.serviceName = serviceName;

    // Return the full envelope as stringified JSON
    // Set Content-Type to text/plain since we're sending stringified JSON
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(JSON.stringify(envelope));
  } catch (error) {
    console.error('[Integration Controller] Error:', error);
    const status = error.status || 500;
    const errorPayload = {
      error: status === 500 ? 'Internal Server Error' : 'Error',
      message: error.message || 'Unhandled error'
    };
    res.setHeader('Content-Type', 'text/plain');
    return res.status(status).send(JSON.stringify(errorPayload));
  }
}

export default {
  handleFillContentMetrics
};
