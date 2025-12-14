/**
 * Fill Content Metrics Service
 * Main service that orchestrates AI query generation, execution, and template filling
 * 
 * This service is called when Course Builder needs to fill response templates
 * with data from its own database using AI-generated SQL queries.
 */

import { generateSQLQuery } from './aiQueryBuilder.service.js';
import { executeQuery, extractQueryParams } from './queryExecutor.service.js';
import { fillTemplate } from '../utils/responseTemplateFiller.js';
import courseRepository from '../repositories/CourseRepository.js';
import db from '../config/database.js';

/**
 * Determine course_id for CAREER_PATH_DRIVEN enrollment
 * Finds active learner-specific course created for the learner
 * @param {string} learnerId - Learner ID
 * @returns {Promise<string|null>} - Course ID or null if not found
 */
async function determineCourseIdForEnrollment(learnerId) {
  try {
    // Find active learner-specific course where created_by_user_id = learner_id
    const courses = await courseRepository.findAll({
      course_type: 'learner_specific',
      status: 'active',
      created_by_user_id: learnerId
    });
    
    if (courses.length === 0) {
      console.warn(`[Fill Content Metrics] No active learner-specific course found for learner: ${learnerId}`);
      return null;
    }
    
    // Return the most recently created course (first in DESC order)
    const courseId = courses[0].id;
    console.log(`[Fill Content Metrics] Determined course_id: ${courseId} for learner: ${learnerId}`);
    return courseId;
  } catch (error) {
    console.error(`[Fill Content Metrics] Error determining course_id for learner ${learnerId}:`, error);
    return null;
  }
}

/**
 * Pre-process payload for enrollment operations
 * Determines course_id for each learner if missing
 * @param {Object} payloadObject - Original payload
 * @param {string|null} action - Action from payload
 * @returns {Promise<Object>} - Payload with course_id added if needed
 */
async function preprocessEnrollmentPayload(payloadObject, action) {
  // Check if this is a CAREER_PATH_DRIVEN enrollment
  if (action && action.includes('enroll') && payloadObject.learning_flow === 'CAREER_PATH_DRIVEN') {
    // If learners array exists, determine course_id for each learner
    if (Array.isArray(payloadObject.learners) && payloadObject.learners.length > 0) {
      const enrichedLearners = await Promise.all(
        payloadObject.learners.map(async (learner) => {
          // If course_id is already provided, use it
          if (learner.course_id) {
            return learner;
          }
          
          // Determine course_id for this learner
          const courseId = await determineCourseIdForEnrollment(learner.learner_id);
          return {
            ...learner,
            course_id: courseId
          };
        })
      );
      
      return {
        ...payloadObject,
        learners: enrichedLearners
      };
    }
  }
  
  return payloadObject;
}

export async function fillContentMetrics(payloadObject, responseTemplate, action = null, isActionMode = false) {
  try {
    // Step 0: Pre-process payload for enrollment operations (determine course_id)
    let processedPayload = payloadObject;
    if (isActionMode && action && action.includes('enroll')) {
      console.log('[Fill Content Metrics] Pre-processing enrollment payload...');
      processedPayload = await preprocessEnrollmentPayload(payloadObject, action);
      console.log('[Fill Content Metrics] Processed payload:', JSON.stringify(processedPayload, null, 2));
    }
    
    // Step 1: Generate SQL query using AI
    console.log('[Fill Content Metrics] Generating SQL query...');
    console.log('[Fill Content Metrics] Mode:', isActionMode ? 'Action/Command' : 'Data-Filling');
    const sqlQuery = await generateSQLQuery(processedPayload, responseTemplate, action, isActionMode);
    console.log('[Fill Content Metrics] Generated SQL:', sqlQuery);

    // Step 2: Extract parameters from payload for the query
    const params = extractQueryParams(processedPayload, sqlQuery);
    console.log('[Fill Content Metrics] Query params:', params);
    
    // Filter out undefined/null params that might not be needed
    // Keep nulls if they're expected by the query (use original params)
    const queryParams = params.filter(p => p !== undefined);

    // Step 3: Execute the query (supports both SELECT and INSERT/UPDATE/DELETE)
    console.log('[Fill Content Metrics] Executing query...');
    const queryResults = await executeQuery(sqlQuery, queryParams, isActionMode, processedPayload);
    console.log('[Fill Content Metrics] Query results:', queryResults);

    // Step 4: Fill the response template with query results
    console.log('[Fill Content Metrics] Filling template...');
    const filledTemplate = fillTemplate(responseTemplate, queryResults);
    console.log('[Fill Content Metrics] Filled template:', filledTemplate);

    // Step 5: Validate that all response template fields are filled
    validateFilledTemplate(responseTemplate, filledTemplate);

    return filledTemplate;
  } catch (error) {
    console.error('[Fill Content Metrics] Error:', error);
    
    // Return a clean error without exposing internal details
    throw new Error(`Failed to fill content metrics: ${error.message}`);
  }
}

/**
 * Validate that all response template fields are filled
 * Throws error if any field is missing, null, or undefined
 * @param {Object} responseTemplate - Original response template
 * @param {Object} filledTemplate - Filled response template
 * @throws {Error} - If validation fails
 */
function validateFilledTemplate(responseTemplate, filledTemplate) {
  if (!responseTemplate || typeof responseTemplate !== 'object') {
    return; // Empty template, nothing to validate
  }
  
  const templateKeys = Object.keys(responseTemplate);
  if (templateKeys.length === 0) {
    return; // Empty template, nothing to validate
  }
  
  const missingFields = [];
  const nullFields = [];
  
  for (const key of templateKeys) {
    if (!(key in filledTemplate)) {
      missingFields.push(key);
    } else if (filledTemplate[key] === null || filledTemplate[key] === undefined) {
      nullFields.push(key);
    }
  }
  
  if (missingFields.length > 0 || nullFields.length > 0) {
    const errors = [];
    if (missingFields.length > 0) {
      errors.push(`Missing fields: ${missingFields.join(', ')}`);
    }
    if (nullFields.length > 0) {
      errors.push(`Null/undefined fields: ${nullFields.join(', ')}`);
    }
    throw new Error(`Response validation failed: ${errors.join('; ')}. Partial or null responses are not allowed.`);
  }
  
  console.log('[Fill Content Metrics] ✅ Response validation passed - all fields filled');
}

export default {
  fillContentMetrics
};
