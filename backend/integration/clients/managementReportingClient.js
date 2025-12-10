/**
 * Management Reporting Outbound Client
 * Sends requests to Management Reporting microservice via unified endpoint
 */

import managementReportingDTO from '../../dtoBuilders/managementReportingDTO.js';
import axios from 'axios';

/**
 * Get Management Reporting API URL from environment
 * @returns {string} Management Reporting API URL
 */
function getApiUrl() {
  const url = process.env.MANAGEMENT_REPORTING_API_URL || process.env.MANAGEMENT_REPORTING_URL;
  if (!url) {
    throw new Error('MANAGEMENT_REPORTING_API_URL or MANAGEMENT_REPORTING_URL must be set in environment variables');
  }
  return `${url}/api/fill-content-metrics`;
}

/**
 * Send course statistics to Management Reporting microservice
 * @param {Object} course - Course entity
 * @param {Array} registrations - Registrations array
 * @param {Array} feedback - Feedback array
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToManagementReporting(course, registrations = [], feedback = []) {
  try {
    // Build payload using DTO
    const sendPayload = managementReportingDTO.buildFromCourseStats(course, registrations, feedback);
    
    // Add action and description fields for Coordinator routing
    sendPayload.action = 'send_course_statistics';
    sendPayload.description = 'Send course statistics including enrollment counts, completion rates, and average ratings for management reporting';

    // Convert to string
    const payloadString = JSON.stringify(sendPayload);

    // Send using unified endpoint format
    const response = await axios.post(
      getApiUrl(),
      new URLSearchParams({
        serviceName: 'ManagementReporting',
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
    console.error('[ManagementReporting Client] Error:', error);
    throw error;
  }
}

export default {
  sendToManagementReporting
};

