/**
 * Content Studio Gateway
 * Routes requests to Content Studio through Coordinator with signatures
 */

import { postToCoordinator } from './coordinatorClient.js';
import contentStudioDTO from '../../dtoBuilders/contentStudioDTO.js';

/**
 * Send request to Content Studio via Coordinator
 * @param {Object} payloadObject - Payload object (will be converted to envelope)
 * @param {Object} payloadObject.learnerData - Learner data (learner_id, learner_name, learner_company)
 * @param {Array} payloadObject.skills - Skills array
 * @param {Array} payloadObject.learning_path - Learning path array (NEW: from Learner AI)
 * @param {string} payloadObject.language - Language code (NEW: from Directory)
 * @param {Object} payloadObject.trainerData - Trainer data (optional: trainer_id, trainer_name)
 * @returns {Promise<Object>} Response payload object
 */
export async function sendToContentStudio(payloadObject) {
  try {
    let sendPayload;
    
    // If learner_ai_data is provided, send it AS-IS (for CAREER_PATH_DRIVEN flow)
    if (payloadObject.learner_ai_data) {
      console.log('[ContentStudio Gateway] Sending Learner AI data AS-IS to Content Studio');
      // Send the entire learner_ai_data object as the payload (with learners_data and career_learning_paths)
      sendPayload = {
        ...payloadObject.learner_ai_data // This contains company_id, company_name, learning_flow, learners_data[]
      };
    } else {
      // Legacy path: Build payload using DTO
      sendPayload = contentStudioDTO.buildSendPayload(
        payloadObject.learnerData || {},
        payloadObject.skills || []
      );

      // Add NEW fields for Directory → Learner AI → Content Studio flow
      if (payloadObject.learning_path) {
        sendPayload.learning_path = payloadObject.learning_path;
      }
      if (payloadObject.language) {
        sendPayload.language = payloadObject.language;
      }
      if (payloadObject.trainerData) {
        sendPayload.trainer_id = payloadObject.trainerData.trainer_id;
        sendPayload.trainer_name = payloadObject.trainerData.trainer_name;
      }

      // Add additional context if provided (for marketplace courses)
      if (payloadObject.courseId) {
        sendPayload.courseId = payloadObject.courseId;
      }
      if (payloadObject.moduleId) {
        sendPayload.moduleId = payloadObject.moduleId;
      }
      if (payloadObject.topic) {
        sendPayload.topic = payloadObject.topic;
      }
    }
    
    // Add action and description fields for Coordinator routing
    sendPayload.action = 'generate_course_content';
    sendPayload.description = 'Generate course content including topics, modules, and lessons based on learning path and skills';

    // Build response template (empty, Content Studio will fill it)
    const responseTemplate = {
      course: []
    };

    // Build envelope for Coordinator
    const envelope = {
      requester_service: 'course-builder-service',
      payload: sendPayload,
      response: responseTemplate
    };

    // ========== LOG REQUEST BODY TO CONTENT STUDIO ==========
    console.log('[ContentStudio Gateway] ========== REQUEST BODY TO CONTENT STUDIO ==========');
    console.log('[ContentStudio Gateway] Full envelope:', JSON.stringify(envelope, null, 2));
    console.log('[ContentStudio Gateway] Payload type:', typeof sendPayload);
    console.log('[ContentStudio Gateway] Payload keys:', Object.keys(sendPayload));
    console.log('[ContentStudio Gateway] Payload structure:', {
      has_action: !!sendPayload.action,
      has_description: !!sendPayload.description,
      has_learner_id: !!sendPayload.learner_id,
      has_learner_name: !!sendPayload.learner_name,
      has_learner_company: !!sendPayload.learner_company,
      has_skills: !!sendPayload.skills,
      skills_count: Array.isArray(sendPayload.skills) ? sendPayload.skills.length : 0,
      has_learning_path: !!sendPayload.learning_path,
      learning_path_type: typeof sendPayload.learning_path,
      learning_path_is_array: Array.isArray(sendPayload.learning_path),
      has_language: !!sendPayload.language,
      has_career_learning_paths: !!sendPayload.career_learning_paths,
      career_learning_paths_type: typeof sendPayload.career_learning_paths,
      career_learning_paths_is_array: Array.isArray(sendPayload.career_learning_paths),
      has_learners_data: !!sendPayload.learners_data,
      learners_data_type: typeof sendPayload.learners_data,
      learners_data_is_array: Array.isArray(sendPayload.learners_data)
    });
    console.log('[ContentStudio Gateway] Full payload:', JSON.stringify(sendPayload, null, 2));
    console.log('[ContentStudio Gateway] ===================================================');

    // Send via Coordinator
    const { data: json } = await postToCoordinator(envelope).catch(() => ({ data: {} }));
    
    // ========== LOG RAW RESPONSE FROM COORDINATOR (CONTENT STUDIO) ==========
    console.log('[ContentStudio Gateway] ========== RAW RESPONSE FROM COORDINATOR ==========');
    console.log('[ContentStudio Gateway] Full response object:', JSON.stringify(json, null, 2));
    console.log('[ContentStudio Gateway] Response type:', typeof json);
    console.log('[ContentStudio Gateway] Response keys:', json ? Object.keys(json) : 'null/undefined');
    console.log('[ContentStudio Gateway] Has response field:', !!json?.response);
    console.log('[ContentStudio Gateway] Has success field:', !!json?.success);
    console.log('[ContentStudio Gateway] Has data field:', !!json?.data);
    if (json?.response) {
      console.log('[ContentStudio Gateway] response keys:', Object.keys(json.response));
      console.log('[ContentStudio Gateway] response type:', typeof json.response);
    }
    console.log('[ContentStudio Gateway] ===================================================');
    
    // Coordinator returns the envelope with filled response field
    // Extract response from envelope structure
    let result = json && json.response ? json.response : (json && json.success ? json.data : json);

    // ========== LOG EXTRACTED RESULT ==========
    console.log('[ContentStudio Gateway] ========== EXTRACTED RESULT ==========');
    console.log('[ContentStudio Gateway] Result type:', typeof result);
    console.log('[ContentStudio Gateway] Result keys:', result ? Object.keys(result) : 'null/undefined');
    console.log('[ContentStudio Gateway] Result structure:', {
      has_courses: !!result?.courses,
      has_course: !!result?.course,
      courses_type: typeof result?.courses,
      course_type: typeof result?.course,
      courses_is_array: Array.isArray(result?.courses),
      course_is_array: Array.isArray(result?.course),
      result_is_array: Array.isArray(result),
      courses_length: result?.courses?.length || 0,
      course_length: result?.course?.length || 0,
      result_length: Array.isArray(result) ? result.length : 0
    });
    console.log('[ContentStudio Gateway] Full result:', JSON.stringify(result, null, 2));
    console.log('[ContentStudio Gateway] ===================================================');

    // Return the filled response object (Content Studio fills the 'course' array)
    return result;
  } catch (error) {
    console.error('[ContentStudio Gateway] Error:', error);
    throw error;
  }
}

export default {
  sendToContentStudio
};
