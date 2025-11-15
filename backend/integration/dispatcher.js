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
 * @returns {Promise<Object>} Response payload object
 */
export async function dispatchIntegrationRequest(serviceName, payloadObject) {
  if (!serviceName || typeof serviceName !== 'string') {
    throw new Error('serviceName is required and must be a string');
  }

  // Normalize service name (case-insensitive)
  const normalizedServiceName = serviceName.trim();

  // Route based on serviceName
  switch (normalizedServiceName) {
    case 'ContentStudio':
      return await handleContentStudioIntegration(payloadObject);

    case 'LearnerAI':
      return await handleLearnerAIIntegration(payloadObject);

    case 'Assessment':
      return await handleAssessmentIntegration(payloadObject);

    case 'SkillsEngine':
      return await handleSkillsIntegration(payloadObject);

    case 'Directory':
      return await handleDirectoryIntegration(payloadObject);

    case 'LearningAnalytics':
      return await handleLearningAnalyticsIntegration(payloadObject);

    case 'ManagementReporting':
      return await handleManagementReportingIntegration(payloadObject);

    case 'Devlab':
    case 'DevLab':
      return await handleDevlabIntegration(payloadObject);

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

