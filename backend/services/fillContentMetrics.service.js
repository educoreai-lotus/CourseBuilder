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
import { sendToLearnerAI } from '../services/gateways/learnerAIGateway.js';
import { buildCourseFromLearningPath } from './buildCourseFromLearningPath.service.js';
import courseRepository from '../repositories/CourseRepository.js';
import { PendingCourseCreationError } from '../utils/PendingCourseCreationError.js';

/**
 * Trigger course creation pipeline for CAREER_PATH_DRIVEN enrollment
 * Flow: Learner AI (returns wrapped JSON with career_learning_paths[]) → Course Builder builds courses directly
 * @param {Array} learners - Array of learner objects with learner_id, learner_name, preferred_language
 * @param {string} companyId - Company ID
 * @param {string} companyName - Company name
 * @param {string} learningFlow - Learning flow (default: "CAREER_PATH_DRIVEN")
 * @returns {Promise<string>} - Course ID of created course (uses first career_learning_path for first learner)
 */
async function triggerCourseCreationPipeline(learners, companyId, companyName, learningFlow = 'CAREER_PATH_DRIVEN') {
  try {
    console.log(`[Fill Content Metrics] Triggering course creation pipeline for ${learners.length} learner(s)`);
    console.log(`[Fill Content Metrics] Company: ${companyName} (${companyId})`);
    console.log(`[Fill Content Metrics] Learning flow: ${learningFlow}`);
    
    // Step 1: Call Learner AI to get wrapped JSON with career_learning_paths[]
    // Send all learners in one request
    console.log('[Fill Content Metrics] Step 1: Calling Learner AI with all learners...');
    const learnerAIResponse = await sendToLearnerAI({
      company_id: companyId,
      company_name: companyName,
      learning_flow: learningFlow.toLowerCase(), // Send as "career_path_driven"
      learners: learners.map(learner => ({
        learner_id: learner.learner_id,
        learner_name: learner.learner_name,
        preferred_language: learner.preferred_language || 'en'
      }))
    });
    
    // ========== LOG FULL LEARNER AI RESPONSE ==========
    console.log('[Fill Content Metrics] ========== LEARNER AI RESPONSE RECEIVED ==========');
    console.log('[Fill Content Metrics] Response type:', typeof learnerAIResponse);
    console.log('[Fill Content Metrics] Response is null/undefined:', learnerAIResponse == null);
    console.log('[Fill Content Metrics] Response keys:', learnerAIResponse ? Object.keys(learnerAIResponse) : 'null/undefined');
    console.log('[Fill Content Metrics] Full response:', JSON.stringify(learnerAIResponse, null, 2));
    console.log('[Fill Content Metrics] Response structure check:', {
      has_learners_data: !!learnerAIResponse?.learners_data,
      has_career_learning_paths: !!learnerAIResponse?.career_learning_paths,
      learners_data_type: typeof learnerAIResponse?.learners_data,
      career_learning_paths_type: typeof learnerAIResponse?.career_learning_paths,
      learners_data_is_array: Array.isArray(learnerAIResponse?.learners_data),
      career_learning_paths_is_array: Array.isArray(learnerAIResponse?.career_learning_paths),
      learners_data_count: learnerAIResponse?.learners_data?.length || 0,
      career_learning_paths_count: learnerAIResponse?.career_learning_paths?.length || 0
    });
    console.log('[Fill Content Metrics] ===================================================');
    
    // Handle new batch response format: data.learners_data[]
    // Each learner has their own career_learning_paths[]
    let allCareerLearningPaths = [];
    
    if (learnerAIResponse.learners_data && Array.isArray(learnerAIResponse.learners_data)) {
      // New batch format: extract career_learning_paths from each learner
      console.log(`[Fill Content Metrics] Processing batch response with ${learnerAIResponse.learners_data.length} learner(s)`);
      
      for (const learnerData of learnerAIResponse.learners_data) {
        if (learnerData.career_learning_paths && Array.isArray(learnerData.career_learning_paths)) {
          // Add learner metadata to each career path
          for (const careerPath of learnerData.career_learning_paths) {
            allCareerLearningPaths.push({
              ...careerPath,
              // Enrich with learner data
              learner_id: learnerData.user_id || learnerData.learner_id,
              learner_name: learnerData.user_name || learnerData.learner_name,
              company_id: learnerData.company_id || learnerAIResponse.company_id || companyId,
              company_name: learnerData.company_name || learnerAIResponse.company_name || companyName,
              learning_flow: learnerData.learning_flow || learnerAIResponse.learning_flow || learningFlow,
              preferred_language: learnerData.preferred_language
            });
          }
        }
      }
    } else if (learnerAIResponse.career_learning_paths && Array.isArray(learnerAIResponse.career_learning_paths)) {
      // Legacy format: career_learning_paths at top level
      console.log('[Fill Content Metrics] Processing legacy response format');
      allCareerLearningPaths = learnerAIResponse.career_learning_paths.map(cp => ({
        ...cp,
        learner_id: learnerAIResponse.user_id,
        learner_name: learnerAIResponse.user_name,
        company_id: learnerAIResponse.company_id || companyId,
        company_name: learnerAIResponse.company_name || companyName,
        learning_flow: learnerAIResponse.learning_flow || learningFlow
      }));
    } else {
      const error = new Error('Learner AI response missing learners_data or career_learning_paths array');
      error.status = 400;
      throw error;
    }
    
    // Validate we have at least one career learning path
    if (allCareerLearningPaths.length === 0) {
      const error = new Error('Learner AI returned empty career_learning_paths array');
      error.status = 400;
      throw error;
    }
    
    console.log(`[Fill Content Metrics] Extracted ${allCareerLearningPaths.length} total career learning path(s) from response`);
    
    // Extract learning_path from each career_learning_path
    // IGNORE skills_raw_data completely (only Content Studio uses it)
    const learningPaths = [];
    
    for (let i = 0; i < allCareerLearningPaths.length; i++) {
      const careerPath = allCareerLearningPaths[i];
      const learningPath = careerPath.learning_path;
      
      if (!learningPath) {
        throw new Error(`Career learning path at index ${i} missing learning_path object`);
      }
      
      // Find matching learner from original request
      const matchingLearner = learners.find(l => 
        l.learner_id === careerPath.learner_id || 
        l.learner_id === learningPath.learner_id
      ) || learners[0];
      
      // Ensure learner_id is set in learning_path
      if (!learningPath.learner_id) {
        learningPath.learner_id = careerPath.learner_id || matchingLearner?.learner_id;
      }
      
      learningPaths.push({
        // Inject key metadata from the wrapper so it is available during DB inserts
        learningPath: {
          ...learningPath,
          competency_target_name: careerPath.competency_target_name || `Career Path ${i + 1}`,
          learning_flow: careerPath.learning_flow || learningFlow,
          // Enrichment for registration step
          learner_name: careerPath.learner_name || matchingLearner?.learner_name || null,
          company_id: careerPath.company_id || companyId || null,
          company_name: careerPath.company_name || companyName || null
        },
        competencyTargetName: careerPath.competency_target_name || `Career Path ${i + 1}`
        // skills_raw_data is IGNORED - not stored, not logged, not used
      });
    }
    
    console.log(`[Fill Content Metrics] Processing ${learningPaths.length} career learning path(s)...`);
    
    // Step 2: Build courses from learning paths
    // Create ONE course per career_learning_path
    // For enrollment, use the FIRST course_id (one enrollment per learner)
    console.log('[Fill Content Metrics] ========== STARTING COURSE CREATION PIPELINE ==========');
    console.log('[Fill Content Metrics] Step 2: Building courses from learning paths...');
    
    const courseIds = [];
    for (let i = 0; i < learningPaths.length; i++) {
      const { learningPath, competencyTargetName } = learningPaths[i];
      console.log(`[Fill Content Metrics] ========== BUILDING COURSE ${i + 1}/${learningPaths.length} ==========`);
      console.log(`[Fill Content Metrics] Competency: ${competencyTargetName}`);
      console.log(`[Fill Content Metrics] Learner ID: ${learningPath.learner_id}`);
      console.log(`[Fill Content Metrics] Path title: ${learningPath.path_title}`);
      console.log(`[Fill Content Metrics] Modules count: ${learningPath.learning_modules?.length || 0}`);
      
      try {
        // Pass the full Learner AI data response to buildCourseFromLearningPath
        // so it can send it AS-IS to Content Studio
        const courseId = await buildCourseFromLearningPath(learningPath, null, learnerAIResponse);
        courseIds.push(courseId);
        console.log(`[Fill Content Metrics] ✅ Course ${i + 1} created successfully: ${courseId}`);
      } catch (courseError) {
        console.error(`[Fill Content Metrics] ❌ FAILED to create course ${i + 1}:`);
        console.error(`[Fill Content Metrics] Error type: ${courseError.constructor.name}`);
        console.error(`[Fill Content Metrics] Error message: ${courseError.message}`);
        console.error(`[Fill Content Metrics] Error stack: ${courseError.stack}`);
        throw courseError; // Re-throw to abort pipeline
      }
    }
    
    // Return the FIRST course_id for enrollment (one enrollment per learner)
    // Multiple courses may be created, but enrollment uses the first one
    const primaryCourseId = courseIds[0];
    console.log(`[Fill Content Metrics] ✅ Course creation completed. Primary course ID: ${primaryCourseId} (${courseIds.length} total courses created)`);
    
    return primaryCourseId;
  } catch (error) {
    // If it's already a PendingCourseCreationError, re-throw it as-is
    if (error instanceof PendingCourseCreationError) {
      throw error;
    }
    
    // For other errors, wrap in generic error (these are real failures)
    console.error(`[Fill Content Metrics] Error in course creation pipeline:`, error);
    console.error(`[Fill Content Metrics] Learners count: ${learners?.length || 0}`);
    throw new Error(`Failed to create course for enrollment: ${error.message}`);
  }
}

/**
 * @deprecated LEGACY_FLOW
 * Pre-process payload for enrollment operations
 * Triggers course creation pipeline if course_id is missing for CAREER_PATH_DRIVEN
 * 
 * ⚠️ THIS FLOW IS CURRENTLY INACTIVE
 * Course Builder NO LONGER initiates calls to Learner AI.
 * Directory-triggered enrollment flow is disabled.
 * 
 * @param {Object} payloadObject - Original payload
 * @param {string|null} action - Action from payload
 * @param {string|null} requesterService - Requester service name (for flow gate validation)
 * @returns {Promise<Object>} - Payload with course_id added for each learner
 */
async function preprocessEnrollmentPayload(payloadObject, action, requesterService = null) {
  // ⚠️ LEGACY_FLOW: Directory-triggered enrollment flow is currently inactive
  // Course Builder now accepts triggers ONLY from Learner AI, not from Directory
  // If Directory tries to trigger enrollment with course creation, return error
  const isDirectoryEnrollment = 
    requesterService === 'directory-service' &&
    action === 'enroll_employees_career_path' &&
    payloadObject.learning_flow === 'CAREER_PATH_DRIVEN';
  
  if (isDirectoryEnrollment) {
    // Directory-triggered enrollment flow is disabled
    // Course Builder no longer initiates calls to Learner AI
    const error = new Error('Directory-triggered enrollment flow is currently inactive. Course Builder now accepts triggers only from Learner AI.');
    error.status = 410; // Gone - resource no longer available
    throw error;
  }
  
  /* LEGACY CODE - PRESERVED FOR POTENTIAL FUTURE REACTIVATION
  // FLOW GATE (CRITICAL): Only execute CAREER_PATH_DRIVEN logic when ALL conditions are met
  // This is the SINGLE SOURCE OF TRUTH for CAREER_PATH_DRIVEN flow
  const isCareerPathDriven = 
    requesterService === 'directory-service' &&
    action === 'enroll_employees_career_path' &&
    payloadObject.learning_flow === 'CAREER_PATH_DRIVEN';
  
  // If learning_flow exists but is NOT CAREER_PATH_DRIVEN, return explicit error
  // DO NOT fallback, DO NOT guess, DO NOT attempt partial handling
  if (payloadObject.learning_flow && payloadObject.learning_flow !== 'CAREER_PATH_DRIVEN') {
    const error = new Error(`Learning flow "${payloadObject.learning_flow}" is not implemented. Only CAREER_PATH_DRIVEN is supported.`);
    error.status = 400; // Bad Request - unsupported flow
    throw error;
  }
  
  // Check if this is a CAREER_PATH_DRIVEN enrollment (all gates passed)
  // If not, return payload as-is (no course creation pipeline)
  if (isCareerPathDriven) {
    // If learners array exists, ensure course_id for each learner
    if (Array.isArray(payloadObject.learners) && payloadObject.learners.length > 0) {
      // Check if all learners already have course_id
      const learnersWithoutCourseId = payloadObject.learners.filter(l => !l.course_id);
      
      if (learnersWithoutCourseId.length === 0) {
        // All learners already have course_id, return as-is
        console.log('[Fill Content Metrics] All learners already have course_id, skipping course creation');
        return payloadObject;
      }
      
      // Some or all learners missing course_id - trigger course creation pipeline
      // Send ALL learners to Learner AI in one request (even those with course_id, for consistency)
      console.log(`[Fill Content Metrics] ${learnersWithoutCourseId.length} learner(s) missing course_id - triggering course creation pipeline...`);
      console.log(`[Fill Content Metrics] Sending ${payloadObject.learners.length} learner(s) to Learner AI`);
      
      // Trigger course creation pipeline with all learners
      // This will create courses for all learners and return course_id for the first learner
      // Note: Learner AI may return multiple career_learning_paths, we'll process all of them
      const primaryCourseId = await triggerCourseCreationPipeline(
        payloadObject.learners, // Send all learners
        payloadObject.company_id,
        payloadObject.company_name,
        payloadObject.learning_flow
      );
      
      if (!primaryCourseId) {
        throw new Error('Course creation pipeline failed - no course_id returned');
      }
      
      // For now, assign the primary course_id to all learners without course_id
      // In the future, Learner AI may return course_id per learner, and we can map them accordingly
      const enrichedLearners = payloadObject.learners.map((learner) => {
        if (learner.course_id) {
          // Keep existing course_id
          return learner;
        }
        // Assign primary course_id (first course created)
        return {
          ...learner,
          course_id: primaryCourseId
        };
      });
      
      return {
        ...payloadObject,
        learners: enrichedLearners
      };
    }
  }
  
  return payloadObject;
  */
  
  // For non-Directory flows, return payload as-is (no preprocessing)
  return payloadObject;
}

export async function fillContentMetrics(payloadObject, responseTemplate, action = null, isActionMode = false, requesterService = null) {
  try {
    // Step 0: Pre-process payload for enrollment operations (trigger course creation if needed)
    // For CAREER_PATH_DRIVEN enrollment, if course_id is missing, trigger course creation pipeline
    // Flow: Learner AI (returns wrapped JSON) → Course Builder builds courses → then enrollment
    let processedPayload = payloadObject;
    if (isActionMode && action && action.includes('enroll')) {
      console.log('[Fill Content Metrics] Pre-processing enrollment payload...');
      processedPayload = await preprocessEnrollmentPayload(payloadObject, action, requesterService);
      console.log('[Fill Content Metrics] Processed payload:', JSON.stringify(processedPayload, null, 2));
      
      // Validate that all learners now have course_id
      if (Array.isArray(processedPayload.learners)) {
        const learnersWithoutCourseId = processedPayload.learners.filter(l => !l.course_id);
        if (learnersWithoutCourseId.length > 0) {
          throw new Error(`Enrollment cannot proceed - ${learnersWithoutCourseId.length} learner(s) missing course_id. Course creation pipeline must complete before enrollment.`);
        }
      }
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
