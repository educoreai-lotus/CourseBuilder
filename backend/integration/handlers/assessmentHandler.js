/**
 * Assessment Integration Handler
 * Handles incoming assessment results from Assessment microservice
 */

import assessmentRepository from '../../repositories/AssessmentRepository.js';
import assessmentDTO from '../../dtoBuilders/assessmentDTO.js';

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
    throw error;
  }
}

export default {
  handleAssessmentIntegration
};

