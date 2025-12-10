/**
 * Learning Analytics Outbound Client
 * Sends requests to Learning Analytics microservice via unified endpoint
 */

import learningAnalyticsDTO from '../../dtoBuilders/learningAnalyticsDTO.js';
import axios from 'axios';

/**
 * Get Learning Analytics API URL from environment
 * @returns {string} Learning Analytics API URL
 */
function getApiUrl() {
  const url = process.env.LEARNING_ANALYTICS_API_URL || process.env.LEARNING_ANALYTICS_URL;
  if (!url) {
    throw new Error('LEARNING_ANALYTICS_API_URL or LEARNING_ANALYTICS_URL must be set in environment variables');
  }
  return `${url}/api/fill-content-metrics`;
}

/**
 * Send analytics data to Learning Analytics microservice
 * @param {Object} course - Course entity
 * @param {Object} analyticsData - Additional analytics data
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToLearningAnalytics(course, analyticsData = {}) {
  try {
    // Build payload using DTO
    const sendPayload = learningAnalyticsDTO.buildSendPayload(course, analyticsData);
    
    // Add action and description fields for Coordinator routing
    sendPayload.action = 'send_analytics';
    sendPayload.description = 'Send course analytics data including enrollments, completion rates, and ratings';

    // Convert to string
    const payloadString = JSON.stringify(sendPayload);

    // Send using unified endpoint format
    const response = await axios.post(
      getApiUrl(),
      new URLSearchParams({
        serviceName: 'LearningAnalytics',
        payload: payloadString
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Parse response payload (Learning Analytics typically only receives, may return empty)
    if (response.data && response.data.payload) {
      return JSON.parse(response.data.payload);
    }

    return response.data;
  } catch (error) {
    console.error('[LearningAnalytics Client] Error:', error);
    throw error;
  }
}

/**
 * Send complete course analytics data to Learning Analytics
 * @param {Object} course - Course entity
 * @param {Array} topics - Topics array
 * @param {Array} lessons - Lessons array
 * @param {Array} registrations - Registrations array
 * @param {Array} feedback - Feedback array
 * @param {Array} assessments - Assessments array
 * @returns {Promise<Object>} Response payload object
 */
export async function sendCourseAnalytics(course, topics = [], lessons = [], registrations = [], feedback = [], assessments = []) {
  try {
    // Build complete analytics payload
    const sendPayload = learningAnalyticsDTO.buildFromCourseData(
      course,
      topics,
      lessons,
      registrations,
      feedback,
      assessments
    );
    
    // Add action and description fields for Coordinator routing
    sendPayload.action = 'send_course_analytics';
    sendPayload.description = 'Send comprehensive course analytics data including structure, enrollments, feedback, and assessments';

    // Convert to string
    const payloadString = JSON.stringify(sendPayload);

    // Send using unified endpoint format
    const response = await axios.post(
      getApiUrl(),
      new URLSearchParams({
        serviceName: 'LearningAnalytics',
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
    console.error('[LearningAnalytics Client] Error:', error);
    throw error;
  }
}

export default {
  sendToLearningAnalytics,
  sendCourseAnalytics
};

