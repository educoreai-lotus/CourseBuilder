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

    // Build response template (empty, Assessment will fill it)
    const responseTemplate = {
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

    // Send via Coordinator
    const { data: json } = await postToCoordinator(envelope).catch(() => ({ data: {} }));
    
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
