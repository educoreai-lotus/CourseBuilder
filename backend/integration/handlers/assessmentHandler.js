/**
 * Assessment Integration Handler
 * Handles incoming assessment results from Assessment microservice
 */

import assessmentRepository from '../../repositories/AssessmentRepository.js';
import assessmentDTO from '../../dtoBuilders/assessmentDTO.js';
import { getFallbackData, shouldUseFallback } from '../fallbackData.js';
import { sendToDevlab } from '../../services/gateways/devlabGateway.js';
import courseRepository from '../../repositories/CourseRepository.js';
import registrationRepository from '../../repositories/RegistrationRepository.js';

/**
 * Handle Assessment integration request
 * @param {Object} payloadObject - Parsed payload from Assessment
 * @param {Object} responseTemplate - Empty response template to fill
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleAssessmentIntegration(payloadObject, responseTemplate) {
  try {
    // Normalize Assessment payload
    const data = assessmentDTO.buildFromReceived(payloadObject);

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

    // Fill response template with contract-matching fields
    responseTemplate.learner_id = assessment.learner_id;
    responseTemplate.course_id = assessment.course_id;
    responseTemplate.course_name = payloadObject.course_name || assessment.course_name || '';
    responseTemplate.exam_type = assessment.exam_type || 'postcourse';
    responseTemplate.passing_grade = assessment.passing_grade || 70.00;
    responseTemplate.final_grade = assessment.final_grade || null;
    responseTemplate.passed = assessment.passed || false;
    
    // If learner passed the exam, trigger DevLab request
    if (assessment.passed === true) {
      triggerDevLabRequest(assessment.course_id, assessment.learner_id, responseTemplate.course_name);
    }
    
    // Return the filled response template
    return responseTemplate;
  } catch (error) {
    console.error('[Assessment Handler] Error:', error);
    
    // Check if we should use fallback data (network/service errors)
    if (shouldUseFallback(error, 'Assessment')) {
      console.warn('[Assessment Handler] Using fallback data due to service unavailability');
      const fallback = getFallbackData('Assessment');
      
      responseTemplate.learner_id = fallback.learner_id || payloadObject.learner_id || '';
      responseTemplate.course_id = fallback.course_id || payloadObject.course_id || '';
      responseTemplate.course_name = fallback.course_name || payloadObject.course_name || '';
      responseTemplate.exam_type = fallback.exam_type || payloadObject.exam_type || 'postcourse';
      responseTemplate.passing_grade = fallback.passing_grade || payloadObject.passing_grade || 70.00;
      responseTemplate.final_grade = fallback.final_grade || payloadObject.final_grade || null;
      responseTemplate.passed = fallback.passed !== undefined ? fallback.passed : (payloadObject.passed || false);
      
      // If learner passed, trigger DevLab (even in fallback scenario)
      if (responseTemplate.passed === true && responseTemplate.course_id) {
        triggerDevLabRequest(responseTemplate.course_id, responseTemplate.learner_id, responseTemplate.course_name);
      }
      
      return responseTemplate;
    }
    
    // For non-network errors, use payload data
    try {
      responseTemplate.learner_id = payloadObject.learner_id || '';
      responseTemplate.course_id = payloadObject.course_id || '';
      responseTemplate.course_name = payloadObject.course_name || '';
      responseTemplate.exam_type = payloadObject.exam_type || 'postcourse';
      responseTemplate.passing_grade = payloadObject.passing_grade || 70.00;
      responseTemplate.final_grade = payloadObject.final_grade || null;
      responseTemplate.passed = payloadObject.passed || false;
      
      // If learner passed, trigger DevLab
      if (responseTemplate.passed === true && responseTemplate.course_id) {
        triggerDevLabRequest(responseTemplate.course_id, responseTemplate.learner_id, responseTemplate.course_name);
      }
      
      return responseTemplate;
    } catch (fallbackError) {
      // Last resort: use mock fallback data
      const fallback = getFallbackData('Assessment');
      return {
        learner_id: fallback.learner_id || '',
        course_id: fallback.course_id || '',
        course_name: fallback.course_name || '',
        exam_type: fallback.exam_type || 'postcourse',
        passing_grade: fallback.passing_grade || 70.00,
        final_grade: fallback.final_grade || null,
        passed: fallback.passed || false
      };
    }
  }
}

/**
 * Helper function to trigger DevLab request (fire-and-forget)
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

    console.log('[Assessment Handler] Learner passed exam - sending request to DevLab via Coordinator:', {
      learner_id: learnerId,
      learner_name: learnerName,
      course_id: courseId,
      course_name: courseName
    });
    
    // Fetch course details
    const course = await courseRepository.findById(courseId);
    if (course) {
      // Send request to DevLab via Coordinator (fire-and-forget, don't wait for response)
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

