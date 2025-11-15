/**
 * Assessment Integration Handler
 * Handles incoming assessment results from Assessment microservice
 */

import assessmentRepository from '../../repositories/AssessmentRepository.js';
import assessmentDTO from '../../dtoBuilders/assessmentDTO.js';

/**
 * Handle Assessment integration request
 * @param {Object} payloadObject - Parsed payload from Assessment
 * @returns {Promise<Object>} Response payload
 */
export async function handleAssessmentIntegration(payloadObject) {
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

    // Return response in unified format
    return {
      serviceName: 'Assessment',
      status: 'success',
      assessment_id: assessment.id,
      learner_id: assessment.learner_id,
      course_id: assessment.course_id,
      passed: assessment.passed,
      final_grade: assessment.final_grade
    };
  } catch (error) {
    console.error('[Assessment Handler] Error:', error);
    throw error;
  }
}

export default {
  handleAssessmentIntegration
};

