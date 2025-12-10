/**
 * Assessment Gateway
 * Routes requests to Assessment through Coordinator with signatures
 */

import { postToCoordinator } from './coordinatorClient.js';
import assessmentDTO from '../../dtoBuilders/assessmentDTO.js';
import lessonRepository from '../../repositories/LessonRepository.js';
import topicRepository from '../../repositories/TopicRepository.js';
import moduleRepository from '../../repositories/ModuleRepository.js';

/**
 * Send assessment request to Assessment microservice via Coordinator
 * @param {Object} course - Course entity
 * @param {string} learnerId - Learner ID
 * @param {string} learnerName - Learner name
 * @param {Array} lessons - Optional lessons array (if already fetched)
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToAssessment(course, learnerId, learnerName, lessons = null) {
  try {
    // Get lessons for coverage_map (built dynamically) if not provided
    if (!lessons || !Array.isArray(lessons)) {
      const topics = await topicRepository.findByCourseId(course.id);
      const modules = [];
      for (const topic of topics) {
        const topicModules = await moduleRepository.findByTopicId(topic.id);
        modules.push(...topicModules);
      }
      lessons = [];
      for (const module of modules) {
        const moduleLessons = await lessonRepository.findByModuleId(module.id);
        lessons.push(...moduleLessons);
      }
    }

    // Build payload using DTO (coverage_map built dynamically from lessons)
    const sendPayload = assessmentDTO.buildSendPayload(course, learnerId, learnerName, lessons);
    
    // Add action field for Coordinator routing
    sendPayload.action = 'create_assessment';

    // Build response template (Assessment will fill it)
    const responseTemplate = {
      assessment_session_id: '',
      redirect_url: '',
      expires_in: 900,
      learner_id: '',
      course_id: '',
      course_name: '',
      exam_type: 'postcourse',
      passing_grade: 70.00,
      final_grade: null,
      passed: null
    };

    // Build envelope for Coordinator
    const envelope = {
      requester_service: 'course_builder',
      payload: sendPayload,
      response: responseTemplate
    };

    console.log('[Assessment Gateway] Sending request to Coordinator:', {
      action: sendPayload.action,
      course_id: sendPayload.course_id,
      learner_id: sendPayload.learner_id,
      coverage_map_length: sendPayload.coverage_map?.length || 0
    });

    // Send via Coordinator - Coordinator will route to Assessment service based on action field
    const { data: json } = await postToCoordinator(envelope).catch((error) => {
      console.error('[Assessment Gateway] Coordinator request failed:', error.message);
      throw error;
    });
    
    console.log('[Assessment Gateway] Received response from Coordinator:', {
      has_redirect_url: !!json?.response?.redirect_url,
      has_assessment_session_id: !!json?.response?.assessment_session_id
    });
    
    // Coordinator returns the envelope with filled response field
    const result = json && json.response ? json.response : (json && json.success ? json.data : json);

    // Return response data
    return result;
  } catch (error) {
    console.error('[Assessment Gateway] Error:', error);
    throw error;
  }
}

export default {
  sendToAssessment
};
