/**
 * Integration Dispatcher
 * Central dispatcher for routing integration requests based on serviceName
 */

import { handleContentStudioIntegration } from './handlers/contentStudioHandler.js';
import { handleLearnerAIIntegration } from './handlers/learnerAIHandler.js';
import { handleAssessmentIntegration } from './handlers/assessmentHandler.js';
import { handleSkillsIntegration } from './handlers/skillsHandler.js';
import { handleDirectoryIntegration } from './handlers/directoryHandler.js';
import { handleLearningAnalyticsIntegration } from './handlers/learningAnalyticsHandler.js';
import { handleManagementReportingIntegration } from './handlers/managementReportingHandler.js';
import { handleDevlabIntegration } from './handlers/devlabHandler.js';
import { handleCourseBuilderIntegration } from './handlers/courseBuilderHandler.js';

/**
 * Dispatch integration request based on serviceName
 * @param {string} serviceName - Name of the service (e.g., "ContentStudio", "LearnerAI", "CourseBuilder")
 * @param {Object} payloadObject - Parsed payload object
 * @param {Object} responseTemplate - Response template object (may be empty {} for specialized handlers, or have fields for AI handler)
 * @param {string|null} action - Action from payload.action (optional, for CourseBuilder handler)
 * @param {string|null} requesterService - Requester service name (optional, for CourseBuilder handler)
 * @param {string|null} requestId - Request ID for logging (optional)
 * @returns {Promise<Object>} Filled response object (or full object {requester_service, payload, response} for CourseBuilder)
 */
export async function dispatchIntegrationRequest(serviceName, payloadObject, responseTemplate, action = null, requesterService = null, requestId = null) {
  const logPrefix = requestId ? `[Dispatcher] [${requestId}]` : '[Dispatcher]';
  
  console.log(`${logPrefix} 🚀 Starting dispatch to service: ${serviceName}`);
  console.log(`${logPrefix}   - Action: ${action || 'N/A'}`);
  console.log(`${logPrefix}   - Requester Service: ${requesterService || 'N/A'}`);
  console.log(`${logPrefix}   - Payload keys: ${Object.keys(payloadObject).join(', ')}`);
  console.log(`${logPrefix}   - Response template keys: ${Object.keys(responseTemplate).join(', ') || 'EMPTY'}`);
  
  if (!serviceName || typeof serviceName !== 'string') {
    console.error(`${logPrefix} ❌ Invalid serviceName`);
    throw new Error('serviceName is required and must be a string');
  }
  
  // Response template must be an object (can be empty {} for specialized handlers)
  if (responseTemplate === null || responseTemplate === undefined || typeof responseTemplate !== 'object') {
    console.error(`${logPrefix} ❌ Invalid responseTemplate`);
    throw new Error('responseTemplate is required and must be an object (can be empty {})');
  }

  // Normalize service name (case-insensitive)
  const normalizedServiceName = serviceName.trim();
  console.log(`${logPrefix} 📍 Normalized service name: ${normalizedServiceName}`);

  const handlerStartTime = Date.now();
  let result;
  
  // Route based on serviceName and pass both payload and response template
  switch (normalizedServiceName) {
    case 'CourseBuilder':
      // Use AI-powered query generation to fill Course Builder's own response templates
      // Pass action if available (extract from payload if not provided)
      console.log(`${logPrefix} 🤖 Routing to CourseBuilder handler (AI-powered)`);
      const actionToUse = action || payloadObject.action || null;
      result = await handleCourseBuilderIntegration(payloadObject, responseTemplate, actionToUse, requesterService, requestId);
      break;

    case 'ContentStudio':
      console.log(`${logPrefix} 🎨 Routing to ContentStudio handler`);
      result = await handleContentStudioIntegration(payloadObject, responseTemplate, requestId);
      break;

    case 'LearnerAI':
      console.log(`${logPrefix} 🧠 Routing to LearnerAI handler`);
      result = await handleLearnerAIIntegration(payloadObject, responseTemplate, requestId);
      break;

    case 'Assessment':
      console.log(`${logPrefix} 📝 Routing to Assessment handler`);
      result = await handleAssessmentIntegration(payloadObject, responseTemplate, requestId);
      break;

    case 'SkillsEngine':
      console.log(`${logPrefix} 🛠️ Routing to SkillsEngine handler`);
      result = await handleSkillsIntegration(payloadObject, responseTemplate, requestId);
      break;

    case 'Directory':
      console.log(`${logPrefix} 📁 Routing to Directory handler`);
      result = await handleDirectoryIntegration(payloadObject, responseTemplate, requestId);
      break;

    case 'LearningAnalytics':
      console.log(`${logPrefix} 📊 Routing to LearningAnalytics handler`);
      result = await handleLearningAnalyticsIntegration(payloadObject, responseTemplate, requestId);
      break;

    case 'ManagementReporting':
      console.log(`${logPrefix} 📈 Routing to ManagementReporting handler`);
      result = await handleManagementReportingIntegration(payloadObject, responseTemplate, requestId);
      break;

    case 'Devlab':
    case 'DevLab':
      console.log(`${logPrefix} 💻 Routing to Devlab handler`);
      result = await handleDevlabIntegration(payloadObject, responseTemplate, requestId);
      break;

    default:
      console.error(`${logPrefix} ❌ Unsupported service: ${normalizedServiceName}`);
      throw new Error(`Unsupported service: ${normalizedServiceName}`);
  }
  
  const handlerDuration = Date.now() - handlerStartTime;
  console.log(`${logPrefix} ✅ Handler completed in ${handlerDuration}ms`);
  console.log(`${logPrefix} 📦 Result type: ${result && typeof result === 'object' ? 'object' : typeof result}`);
  console.log(`${logPrefix} 📦 Result keys: ${result && typeof result === 'object' ? Object.keys(result).join(', ') : 'N/A'}`);
  
  return result;
}

/**
 * Get list of supported services
 * @returns {Array<string>} Array of supported service names
 */
export function getSupportedServices() {
  return [
    'CourseBuilder',
    'ContentStudio',
    'LearnerAI',
    'Assessment',
    'SkillsEngine',
    'Directory',
    'LearningAnalytics',
    'ManagementReporting',
    'Devlab'
  ];
}

export default {
  dispatchIntegrationRequest,
  getSupportedServices
};

