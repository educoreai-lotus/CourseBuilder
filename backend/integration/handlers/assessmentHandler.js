/**
 * Assessment Integration Handler
 * Handles incoming assessment results from Assessment microservice
 */

import assessmentRepository from '../../repositories/AssessmentRepository.js';
import assessmentDTO from '../../dtoBuilders/assessmentDTO.js';
import { getFallbackData, shouldUseFallback } from '../fallbackData.js';

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

export default {
  handleAssessmentIntegration
};

