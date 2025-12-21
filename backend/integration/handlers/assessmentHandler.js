/**
 * Assessment Integration Handler
 * Handles incoming requests from Assessment microservice
 * Supports 3 request types:
 * 1. COVERAGE_MAP_REQUEST - Assessment requests coverage map
 * 2. EXAM_RESULT - Assessment sends exam results
 */

import assessmentRepository from '../../repositories/AssessmentRepository.js';
import assessmentDTO from '../../dtoBuilders/assessmentDTO.js';
import { getFallbackData, shouldUseFallback } from '../fallbackData.js';
import { sendToDevlab } from '../../services/gateways/devlabGateway.js';
import courseRepository from '../../repositories/CourseRepository.js';
import registrationRepository from '../../repositories/RegistrationRepository.js';
import lessonFetcher from '../../services/lessonFetcher.service.js';

/**
 * Normalize action string (case-insensitive, handle typos)
 * @param {string} action - Action string
 * @returns {string} Normalized action
 */
function normalizeAction(action) {
  if (!action || typeof action !== 'string') {
    return null;
  }
  const normalized = action.toLowerCase().trim();
  // Handle known typo: "coverge map" -> "coverage map"
  if (normalized === 'coverge map') {
    return 'coverage map';
  }
  return normalized;
}

/**
 * Check if payload has exam result fields
 * @param {Object} payloadObject - Payload to check
 * @returns {boolean} True if payload contains exam result fields
 */
function hasExamResultFields(payloadObject) {
  return (
    payloadObject &&
    typeof payloadObject === 'object' &&
    (payloadObject.final_grade !== undefined ||
     payloadObject.passed !== undefined ||
     (payloadObject.exam_type && payloadObject.passing_grade !== undefined))
  );
}

/**
 * Handle coverage map request from Assessment
 * REQUEST TYPE: COVERAGE_MAP_REQUEST
 * @param {Object} payloadObject - Parsed payload from Assessment
 * @param {Object} responseTemplate - Response template
 * @param {string} requesterService - Requester service name (for validation)
 * @returns {Promise<Object>} Response with coverage_map
 */
async function handleCoverageMapRequest(payloadObject, responseTemplate, requesterService) {
  console.log(`
========================================
📋 RECEIVED FROM ASSESSMENT (COVERAGE MAP REQUEST)
========================================
`);
  console.log('[Assessment Handler] Request Type: COVERAGE_MAP_REQUEST');
  console.log('[Assessment Handler] Requester Service:', requesterService);
  console.log('[Assessment Handler] Full Payload Received:');
  console.log(JSON.stringify(payloadObject, null, 2));
  console.log(`
[Assessment Handler] Payload Details:
- action: ${payloadObject.action || 'N/A'}
- course_id: ${payloadObject.course_id || 'MISSING'}
- learner_id: ${payloadObject.learner_id || 'MISSING'}
- learner_name: ${payloadObject.learner_name || 'N/A'}
- course_name: ${payloadObject.course_name || 'N/A'}
`);

  // Safety: Validate requester_service (case-insensitive)
  const normalizedRequester = requesterService ? requesterService.toLowerCase().trim() : '';
  if (normalizedRequester !== 'assessment-service') {
    console.error(`
========================================
❌ VALIDATION FAILED: COVERAGE MAP REQUEST
========================================
[Assessment Handler] Invalid requester_service: ${requesterService || 'missing'}
Expected: assessment-service
========================================
`);
    throw new Error(`Coverage map requests must come from assessment-service, got: ${requesterService || 'missing'}`);
  }

  // Safety: Validate required fields
  if (!payloadObject.course_id) {
    throw new Error('course_id is required for coverage map request');
  }
  if (!payloadObject.learner_id) {
    throw new Error('learner_id is required for coverage map request');
  }

  console.log('[Assessment Handler] ✅ Validation passed, fetching lessons...');
  
  // Fetch lessons for the course
  const lessons = await lessonFetcher.fetchLessonsForCourse(payloadObject.course_id);
  console.log(`[Assessment Handler] Fetched ${lessons.length} lessons for course ${payloadObject.course_id}`);
  
  // Build coverage map
  const coverage_map = assessmentDTO.buildCoverageMapFromLessons(lessons);

  console.log(`
========================================
📋 SENT TO ASSESSMENT (COVERAGE MAP RESPONSE)
========================================
`);
  console.log('[Assessment Handler] Response Type: COVERAGE_MAP_RESPONSE');
  console.log('[Assessment Handler] Coverage Map Built:');
  console.log(JSON.stringify({ coverage_map }, null, 2));
  console.log(`
[Assessment Handler] Response Details:
- coverage_map_length: ${coverage_map.length}
- course_id: ${payloadObject.course_id}
- learner_id: ${payloadObject.learner_id}
`);
  console.log(`========================================
`);

  // Return response with coverage_map
  return {
    coverage_map
  };
}

/**
 * Handle exam result from Assessment
 * REQUEST TYPE: EXAM_RESULT
 * @param {Object} payloadObject - Parsed payload from Assessment
 * @param {Object} responseTemplate - Response template (should be {})
 * @param {string} requesterService - Requester service name (for validation)
 * @returns {Promise<Object>} Empty response {}
 */
async function handleExamResult(payloadObject, responseTemplate, requesterService) {
  console.log(`
========================================
✅ RECEIVED FROM ASSESSMENT (EXAM RESULT)
========================================
`);
  console.log('[Assessment Handler] Request Type: EXAM_RESULT');
  console.log('[Assessment Handler] Requester Service:', requesterService);
  console.log('[Assessment Handler] Full Payload Received:');
  console.log(JSON.stringify(payloadObject, null, 2));
  console.log(`
[Assessment Handler] Payload Details:
- user_id: ${payloadObject.user_id || 'N/A'}
- learner_id: ${payloadObject.learner_id || 'N/A'}
- course_id: ${payloadObject.course_id || 'MISSING'}
- course_name: ${payloadObject.course_name || 'N/A'}
- exam_type: ${payloadObject.exam_type || 'N/A'}
- passing_grade: ${payloadObject.passing_grade || 'N/A'}
- final_grade: ${payloadObject.final_grade !== undefined ? payloadObject.final_grade : 'N/A'}
- passed: ${payloadObject.passed !== undefined ? payloadObject.passed : 'N/A'}
`);

  // Safety: Validate requester_service (case-insensitive)
  const normalizedRequester = requesterService ? requesterService.toLowerCase().trim() : '';
  if (normalizedRequester !== 'assessment-service') {
    console.error(`
========================================
❌ VALIDATION FAILED: EXAM RESULT REQUEST
========================================
[Assessment Handler] Invalid requester_service: ${requesterService || 'missing'}
Expected: assessment-service
========================================
`);
    throw new Error(`Exam result requests must come from assessment-service, got: ${requesterService || 'missing'}`);
  }

  // Normalize Assessment payload (handles user_id -> learner_id)
  const data = assessmentDTO.buildFromReceived(payloadObject);
  console.log('[Assessment Handler] Normalized Data:', {
    learner_id: data.learner_id,
    course_id: data.course_id,
    exam_type: data.exam_type,
    passing_grade: data.passing_grade,
    final_grade: data.final_grade,
    passed: data.passed
  });

  // Validate required fields
  if (!data.learner_id) {
    throw new Error('learner_id (or user_id) is required for exam result');
  }
  if (!data.course_id) {
    throw new Error('course_id is required for exam result');
  }

  console.log('[Assessment Handler] ✅ Validation passed, storing assessment result...');

  // Create or update assessment record
  const existing = await assessmentRepository.findByLearnerAndCourse(
    data.learner_id,
    data.course_id
  );

  let assessment;
  if (existing) {
    console.log('[Assessment Handler] Updating existing assessment:', existing.id);
    // Update existing assessment (create new record with same IDs)
    assessment = await assessmentRepository.create({
      ...data,
      id: existing.id
    });
  } else {
    console.log('[Assessment Handler] Creating new assessment record');
    assessment = await assessmentRepository.create(data);
  }

  console.log(`
========================================
✅ EXAM RESULT STORED SUCCESSFULLY
========================================
[Assessment Handler] Assessment Details:
- assessment_id: ${assessment.id}
- course_id: ${assessment.course_id}
- learner_id: ${assessment.learner_id}
- exam_type: ${assessment.exam_type}
- passing_grade: ${assessment.passing_grade}
- final_grade: ${assessment.final_grade !== null ? assessment.final_grade : 'N/A'}
- passed: ${assessment.passed !== null ? assessment.passed : 'N/A'}
`);
  
  // If learner passed the exam, trigger DevLab request
  if (assessment.passed === true) {
    console.log(`
========================================
🎉 LEARNER PASSED - TRIGGERING DEVLAB
========================================
`);
    triggerDevLabRequest(assessment.course_id, assessment.learner_id, payloadObject.course_name || assessment.course_name || '');
  }
  
  console.log(`
========================================
✅ SENT TO ASSESSMENT (EXAM RESULT RESPONSE)
========================================
[Assessment Handler] Response: {} (empty response as per contract)
========================================
`);

  // Return empty response (Assessment doesn't need any data back)
  return {};
}

/**
 * Handle Assessment integration request
 * Routes to appropriate handler based on payload.action
 * @param {Object} payloadObject - Parsed payload from Assessment
 * @param {Object} responseTemplate - Response template
 * @param {string} requesterService - Requester service name (from envelope)
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleAssessmentIntegration(payloadObject, responseTemplate, requesterService = null) {
  try {
    console.log(`
========================================
📥 INCOMING REQUEST FROM ASSESSMENT
========================================
[Assessment Handler] Analyzing request...
- requester_service: ${requesterService || 'MISSING'}
- action: ${payloadObject.action || 'N/A'}
- has_exam_result_fields: ${hasExamResultFields(payloadObject)}
- course_id: ${payloadObject.course_id || 'N/A'}
- learner_id: ${payloadObject.learner_id || payloadObject.user_id || 'N/A'}
========================================
`);

    // Extract action from payload (case-insensitive)
    const action = normalizeAction(payloadObject.action);
    console.log(`[Assessment Handler] Normalized action: ${action || 'null'}`);
    
    // Route based on action
    if (action === 'coverage map') {
      // REQUEST TYPE: COVERAGE_MAP_REQUEST
      console.log('[Assessment Handler] → Routing to COVERAGE_MAP_REQUEST handler');
      return await handleCoverageMapRequest(payloadObject, responseTemplate, requesterService);
    } else if (hasExamResultFields(payloadObject)) {
      // REQUEST TYPE: EXAM_RESULT
      console.log('[Assessment Handler] → Routing to EXAM_RESULT handler');
      return await handleExamResult(payloadObject, responseTemplate, requesterService);
    } else {
      // Unknown request type
      console.error(`
========================================
❌ UNKNOWN REQUEST TYPE
========================================
[Assessment Handler] Cannot determine request type:
- action: ${payloadObject.action || 'missing'}
- has_exam_result_fields: ${hasExamResultFields(payloadObject)}
- payload keys: ${Object.keys(payloadObject).join(', ')}
========================================
`);
      throw new Error(`Unknown assessment request type. Action: ${payloadObject.action || 'missing'}, Has exam result fields: ${hasExamResultFields(payloadObject)}`);
    }
  } catch (error) {
    console.error(`
========================================
❌ ERROR PROCESSING ASSESSMENT REQUEST
========================================
[Assessment Handler] Error: ${error.message}
[Assessment Handler] Stack: ${error.stack}
[Assessment Handler] Request Details:
- action: ${payloadObject.action || 'N/A'}
- course_id: ${payloadObject.course_id || 'N/A'}
- learner_id: ${payloadObject.learner_id || payloadObject.user_id || 'N/A'}
- requester_service: ${requesterService || 'N/A'}
========================================
`);
    
    // Re-throw validation errors
    if (error.message.includes('required') || error.message.includes('must come from')) {
      throw error;
    }
    
    // For other errors, return empty response (don't break Assessment service)
    console.warn('[Assessment Handler] Returning empty response due to error');
    return {};
  }
}

/**
 * Helper function to trigger DevLab request (fire-and-forget)
 * Called when learner passes exam (exam_result handler)
 * @param {string} courseId - Course ID
 * @param {string} learnerId - Learner ID
 * @param {string} courseName - Course name (optional, for logging)
 */
async function triggerDevLabRequest(courseId, learnerId, courseName = '') {
  try {
    // Fetch learner name from registration
    let learnerName = null;
    try {
      const registration = await registrationRepository.findByLearnerAndCourse(learnerId, courseId);
      if (registration && registration.learner_name) {
        learnerName = registration.learner_name;
      }
    } catch (regError) {
      console.warn('[Assessment Handler] Could not fetch learner name from registration:', regError.message);
    }

    console.log('[Assessment Handler] ✅ EXAM_RESULT: Learner passed exam - triggering DevLab request', {
      learner_id: learnerId,
      learner_name: learnerName,
      course_id: courseId,
      course_name: courseName
    });
    
    // Fetch course details
    const course = await courseRepository.findById(courseId);
    if (course) {
      // Send request to DevLab via Coordinator (fire-and-forget, don't wait for response)
      // DevLab gateway already includes action and description
      sendToDevlab(course, learnerId, learnerName).catch((error) => {
        console.error('[Assessment Handler] DevLab request failed (non-blocking):', error.message);
      });
    } else {
      console.warn('[Assessment Handler] Course not found for DevLab request:', courseId);
    }
  } catch (error) {
    console.error('[Assessment Handler] Error triggering DevLab request:', error.message);
    // Don't throw - continue with assessment response
  }
}

export default {
  handleAssessmentIntegration
};

