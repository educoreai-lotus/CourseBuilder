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
 * @returns {Promise<Object>} Filled response object (or full object {requester_service, payload, response} for CourseBuilder)
 */
export async function dispatchIntegrationRequest(serviceName, payloadObject, responseTemplate, action = null, requesterService = null) {
  if (!serviceName || typeof serviceName !== 'string') {
    throw new Error('serviceName is required and must be a string');
  }
  
  // Response template must be an object (can be empty {} for specialized handlers)
  if (responseTemplate === null || responseTemplate === undefined || typeof responseTemplate !== 'object') {
    throw new Error('responseTemplate is required and must be an object (can be empty {})');
  }

  // Normalize service name (case-insensitive)
  const normalizedServiceName = serviceName.trim();

  // Route based on serviceName and pass both payload and response template
  switch (normalizedServiceName) {
    case 'CourseBuilder':
      // Use AI-powered query generation to fill Course Builder's own response templates
      // Pass action if available (extract from payload if not provided)
      const actionToUse = action || payloadObject.action || null;
      return await handleCourseBuilderIntegration(payloadObject, responseTemplate, actionToUse, requesterService);

    case 'ContentStudio':
      return await handleContentStudioIntegration(payloadObject, responseTemplate);

    case 'LearnerAI':
      return await handleLearnerAIIntegration(payloadObject, responseTemplate);

    case 'Assessment':
      return await handleAssessmentIntegration(payloadObject, responseTemplate, requesterService);

    case 'SkillsEngine':
      return await handleSkillsIntegration(payloadObject, responseTemplate);

    case 'Directory':
      return await handleDirectoryIntegration(payloadObject, responseTemplate);

    case 'LearningAnalytics':
      return await handleLearningAnalyticsIntegration(payloadObject, responseTemplate);

    case 'ManagementReporting':
      return await handleManagementReportingIntegration(payloadObject, responseTemplate);

    case 'Devlab':
    case 'DevLab':
      return await handleDevlabIntegration(payloadObject, responseTemplate);

    default:
      throw new Error(`Unsupported service: ${normalizedServiceName}`);
  }
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

