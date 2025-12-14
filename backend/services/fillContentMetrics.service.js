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
import { sendToContentStudio } from '../services/gateways/contentStudioGateway.js';
import { handleContentStudioIntegration } from '../integration/handlers/contentStudioHandler.js';
import courseRepository from '../repositories/CourseRepository.js';
import { PendingCourseCreationError } from '../utils/PendingCourseCreationError.js';

/**
 * Trigger course creation pipeline for CAREER_PATH_DRIVEN enrollment
 * Flow: Learner AI → Content Studio → Course Builder creates course
 * @param {Object} learner - Learner object with learner_id, learner_name, etc.
 * @param {string} competencyTag - Competency tag (e.g., "Node.js Backend Development")
 * @param {string} companyId - Company ID
 * @param {string} companyName - Company name
 * @returns {Promise<string>} - Course ID of created course
 */
async function triggerCourseCreationPipeline(learner, competencyTag, companyId, companyName) {
  try {
    console.log(`[Fill Content Metrics] Triggering course creation pipeline for learner: ${learner.learner_id}`);
    console.log(`[Fill Content Metrics] Competency tag: ${competencyTag}`);
    
    // Step 1: Call Learner AI to get learning path and skills
    console.log('[Fill Content Metrics] Step 1: Calling Learner AI...');
    const learnerAIResponse = await sendToLearnerAI({
      user_id: learner.learner_id,
      tag: competencyTag || 'General Learning Path'
    });
    
    console.log('[Fill Content Metrics] Learner AI response:', {
      has_learning_path: !!learnerAIResponse.learning_path,
      has_skills: !!learnerAIResponse.skills,
      skills_count: learnerAIResponse.skills?.length || 0
    });
    
    // Check if Learner AI returned no learning path/skills
    const hasNoLearningPath = !learnerAIResponse.learning_path || 
                              (Array.isArray(learnerAIResponse.learning_path) && learnerAIResponse.learning_path.length === 0);
    const hasNoSkills = !learnerAIResponse.skills || 
                       (Array.isArray(learnerAIResponse.skills) && learnerAIResponse.skills.length === 0);
    
    if (hasNoLearningPath && hasNoSkills) {
      console.warn(`[Fill Content Metrics] Learner AI returned no learning path or skills for learner: ${learner.learner_id}`);
    }
    
    // Step 2: Call Content Studio to generate course content
    console.log('[Fill Content Metrics] Step 2: Calling Content Studio...');
    const contentStudioPayload = {
      learnerData: {
        learner_id: learner.learner_id,
        learner_name: learner.learner_name || '',
        learner_company: companyName || ''
      },
      skills: learnerAIResponse.skills || []
    };
    
    const contentStudioResponse = await sendToContentStudio(contentStudioPayload);
    console.log('[Fill Content Metrics] Content Studio response:', {
      has_topics: !!contentStudioResponse.topics,
      topics_count: contentStudioResponse.topics?.length || 0
    });
    
    // Step 3: Create course structure using Content Studio handler
    console.log('[Fill Content Metrics] Step 3: Creating course structure...');
    
    // Check if Content Studio returned no topics (even after fallback)
    if (!contentStudioResponse.topics || contentStudioResponse.topics.length === 0) {
      // This is a PENDING state, not a failure
      // Learner AI returned no learning path/skills AND fallback couldn't produce topics
      const reason = hasNoLearningPath && hasNoSkills
        ? `Learner AI returned no learning path or skills for learner ${learner.learner_id}, and fallback logic could not produce course topics. Course creation is pending.`
        : `Content Studio returned no topics for course creation. Course creation is pending.`;
      
      throw new PendingCourseCreationError(
        `Course creation cannot complete yet - no course topics available`,
        reason
      );
    }
    
    // Prepare payload for Content Studio handler
    const contentStudioHandlerPayload = {
      learner_id: learner.learner_id,
      learner_name: learner.learner_name || '',
      learner_company: companyName || '',
      skills: learnerAIResponse.skills || [],
      topics: contentStudioResponse.topics
    };
    
    const contentStudioResponseTemplate = {
      learner_id: learner.learner_id,
      learner_name: learner.learner_name || '',
      learner_company: companyName || '',
      topics: contentStudioResponse.topics
    };
    
    // Create the course (this will create course, topics, modules, lessons)
    const courseCreationResult = await handleContentStudioIntegration(
      contentStudioHandlerPayload,
      contentStudioResponseTemplate
    );
    
    // Step 4: Extract course_id from the handler response
    // The handler returns { course: [{ course_id, ... }] }
    console.log('[Fill Content Metrics] Step 4: Extracting course_id from creation result...');
    
    let courseId = null;
    if (courseCreationResult && courseCreationResult.course && Array.isArray(courseCreationResult.course) && courseCreationResult.course.length > 0) {
      courseId = courseCreationResult.course[0].course_id;
    }
    
    // Fallback: If course_id not in response, find it by learner_id
    if (!courseId) {
      console.log('[Fill Content Metrics] Course ID not in response, searching by learner_id...');
      const courses = await courseRepository.findAll({
        course_type: 'learner_specific',
        status: 'active',
        created_by_user_id: learner.learner_id
      });
      
      if (courses.length > 0) {
        // Get the most recently created course (first in DESC order)
        courseId = courses[0].id;
      }
    }
    
    if (!courseId) {
      throw new Error(`Course creation failed - no course_id found for learner: ${learner.learner_id}`);
    }
    
    console.log(`[Fill Content Metrics] ✅ Course created successfully: ${courseId}`);
    
    return courseId;
  } catch (error) {
    // If it's already a PendingCourseCreationError, re-throw it as-is
    if (error instanceof PendingCourseCreationError) {
      throw error;
    }
    
    // For other errors, wrap in generic error (these are real failures)
    console.error(`[Fill Content Metrics] Error in course creation pipeline for learner ${learner.learner_id}:`, error);
    throw new Error(`Failed to create course for enrollment: ${error.message}`);
  }
}

/**
 * Pre-process payload for enrollment operations
 * Triggers course creation pipeline if course_id is missing for CAREER_PATH_DRIVEN
 * @param {Object} payloadObject - Original payload
 * @param {string|null} action - Action from payload
 * @returns {Promise<Object>} - Payload with course_id added for each learner
 */
async function preprocessEnrollmentPayload(payloadObject, action) {
  // Check if this is a CAREER_PATH_DRIVEN enrollment
  if (action && action.includes('enroll') && payloadObject.learning_flow === 'CAREER_PATH_DRIVEN') {
    // If learners array exists, ensure course_id for each learner
    if (Array.isArray(payloadObject.learners) && payloadObject.learners.length > 0) {
      const enrichedLearners = await Promise.all(
        payloadObject.learners.map(async (learner) => {
          // If course_id is already provided, use it
          if (learner.course_id) {
            console.log(`[Fill Content Metrics] Learner ${learner.learner_id} already has course_id: ${learner.course_id}`);
            return learner;
          }
          
          // Course_id is missing - trigger course creation pipeline
          console.log(`[Fill Content Metrics] Learner ${learner.learner_id} missing course_id - triggering course creation...`);
          
          // Extract competency tag from learner or use default
          // The competency tag might be in learner.learning_flow_tag or payloadObject.competency_name
          const competencyTag = learner.learning_flow_tag || 
                              learner.competency_name || 
                              payloadObject.competency_name || 
                              'General Learning Path';
          
          // Trigger course creation pipeline
          const courseId = await triggerCourseCreationPipeline(
            learner,
            competencyTag,
            payloadObject.company_id,
            payloadObject.company_name
          );
          
          if (!courseId) {
            throw new Error(`Course creation failed for learner: ${learner.learner_id}`);
          }
          
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
    // Step 0: Pre-process payload for enrollment operations (trigger course creation if needed)
    // For CAREER_PATH_DRIVEN enrollment, if course_id is missing, trigger course creation pipeline
    // Flow: Learner AI → Content Studio → Course Builder creates course → then enrollment
    let processedPayload = payloadObject;
    if (isActionMode && action && action.includes('enroll')) {
      console.log('[Fill Content Metrics] Pre-processing enrollment payload...');
      processedPayload = await preprocessEnrollmentPayload(payloadObject, action);
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
