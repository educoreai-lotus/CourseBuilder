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

/**
 * Dispatch integration request based on serviceName
 * @param {string} serviceName - Name of the service (e.g., "ContentStudio", "LearnerAI")
 * @param {Object} payloadObject - Parsed payload object
 * @param {Object} responseTemplate - Empty response template object to be filled by handler
 * @returns {Promise<Object>} Filled response object
 */
export async function dispatchIntegrationRequest(serviceName, payloadObject, responseTemplate) {
  if (!serviceName || typeof serviceName !== 'string') {
    throw new Error('serviceName is required and must be a string');
  }
  
  if (!responseTemplate || typeof responseTemplate !== 'object') {
    throw new Error('responseTemplate is required and must be an object');
  }

  // Normalize service name (case-insensitive)
  const normalizedServiceName = serviceName.trim();

  // Route based on serviceName and pass both payload and response template
  switch (normalizedServiceName) {
    case 'ContentStudio':
      return await handleContentStudioIntegration(payloadObject, responseTemplate);

    case 'LearnerAI':
      return await handleLearnerAIIntegration(payloadObject, responseTemplate);

    case 'Assessment':
      return await handleAssessmentIntegration(payloadObject, responseTemplate);

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

