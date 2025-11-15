/**
 * Assessment Outbound Client
 * Sends requests to Assessment microservice via unified endpoint
 */

import assessmentDTO from '../../dtoBuilders/assessmentDTO.js';
import lessonRepository from '../../repositories/LessonRepository.js';
import topicRepository from '../../repositories/TopicRepository.js';
import moduleRepository from '../../repositories/ModuleRepository.js';
import axios from 'axios';

/**
 * Get Assessment API URL from environment
 * @returns {string} Assessment API URL
 */
function getApiUrl() {
  const url = process.env.ASSESSMENT_API_URL || process.env.ASSESSMENT_URL;
  if (!url) {
    throw new Error('ASSESSMENT_API_URL or ASSESSMENT_URL must be set in environment variables');
  }
  return `${url}/api/fill-content-metrics`;
}

/**
 * Send assessment request to Assessment microservice
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

    // Convert to string
    const payloadString = JSON.stringify(sendPayload);

    // Send using unified endpoint format
    const response = await axios.post(
      getApiUrl(),
      new URLSearchParams({
        serviceName: 'Assessment',
        payload: payloadString
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Parse response payload
    if (response.data && response.data.payload) {
      return JSON.parse(response.data.payload);
    }

    return response.data;
  } catch (error) {
    console.error('[Assessment Client] Error:', error);
    throw error;
  }
}

export default {
  sendToAssessment
};

