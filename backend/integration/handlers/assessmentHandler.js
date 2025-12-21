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
  console.log('[Assessment Handler] 📋 COVERAGE_MAP_REQUEST: Processing coverage map request', {
    requester_service: requesterService,
    course_id: payloadObject.course_id,
    learner_id: payloadObject.learner_id,
    learner_name: payloadObject.learner_name
  });

  // Safety: Validate requester_service (case-insensitive)
  const normalizedRequester = requesterService ? requesterService.toLowerCase().trim() : '';
  if (normalizedRequester !== 'assessment-service') {
    throw new Error(`Coverage map requests must come from assessment-service, got: ${requesterService || 'missing'}`);
  }

  // Safety: Validate required fields
  if (!payloadObject.course_id) {
    throw new Error('course_id is required for coverage map request');
  }
  if (!payloadObject.learner_id) {
    throw new Error('learner_id is required for coverage map request');
  }

  // Fetch lessons for the course
  const lessons = await lessonFetcher.fetchLessonsForCourse(payloadObject.course_id);
  
  // Build coverage map
  const coverage_map = assessmentDTO.buildCoverageMapFromLessons(lessons);

  console.log('[Assessment Handler] 📋 COVERAGE_MAP_REQUEST: Coverage map built successfully', {
    course_id: payloadObject.course_id,
    learner_id: payloadObject.learner_id,
    coverage_map_length: coverage_map.length
  });

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
  console.log('[Assessment Handler] ✅ EXAM_RESULT: Processing exam result', {
    requester_service: requesterService,
    course_id: payloadObject.course_id,
    user_id: payloadObject.user_id,
    learner_id: payloadObject.learner_id,
    final_grade: payloadObject.final_grade,
    passed: payloadObject.passed
  });

  // Safety: Validate requester_service (case-insensitive)
  const normalizedRequester = requesterService ? requesterService.toLowerCase().trim() : '';
  if (normalizedRequester !== 'assessment-service') {
    throw new Error(`Exam result requests must come from assessment-service, got: ${requesterService || 'missing'}`);
  }

  // Normalize Assessment payload (handles user_id -> learner_id)
  const data = assessmentDTO.buildFromReceived(payloadObject);

  // Validate required fields
  if (!data.learner_id) {
    throw new Error('learner_id (or user_id) is required for exam result');
  }
  if (!data.course_id) {
    throw new Error('course_id is required for exam result');
  }

  // Create or update assessment record
  const existing = await assessmentRepository.findByLearnerAndCourse(
    data.learner_id,
    data.course_id
  );

  let assessment;
  if (existing) {
    // Update existing assessment (create new record with same IDs)
    assessment = await assessmentRepository.create({
      ...data,
      id: existing.id
    });
  } else {
    assessment = await assessmentRepository.create(data);
  }

  console.log('[Assessment Handler] ✅ EXAM_RESULT: Assessment result stored', {
    assessment_id: assessment.id,
    course_id: assessment.course_id,
    learner_id: assessment.learner_id,
    final_grade: assessment.final_grade,
    passed: assessment.passed
  });
  
  // If learner passed the exam, trigger DevLab request
  if (assessment.passed === true) {
    console.log('[Assessment Handler] ✅ EXAM_RESULT: Learner passed - triggering DevLab request');
    triggerDevLabRequest(assessment.course_id, assessment.learner_id, payloadObject.course_name || assessment.course_name || '');
  }
  
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
    // Extract action from payload (case-insensitive)
    const action = normalizeAction(payloadObject.action);
    
    // Route based on action
    if (action === 'coverage map') {
      // REQUEST TYPE: COVERAGE_MAP_REQUEST
      return await handleCoverageMapRequest(payloadObject, responseTemplate, requesterService);
    } else if (hasExamResultFields(payloadObject)) {
      // REQUEST TYPE: EXAM_RESULT
      return await handleExamResult(payloadObject, responseTemplate, requesterService);
    } else {
      // Unknown request type
      throw new Error(`Unknown assessment request type. Action: ${payloadObject.action || 'missing'}, Has exam result fields: ${hasExamResultFields(payloadObject)}`);
    }
  } catch (error) {
    console.error('[Assessment Handler] ❌ Error processing assessment request:', {
      error: error.message,
      action: payloadObject.action,
      course_id: payloadObject.course_id,
      learner_id: payloadObject.learner_id || payloadObject.user_id,
      requester_service: requesterService
    });
    
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

