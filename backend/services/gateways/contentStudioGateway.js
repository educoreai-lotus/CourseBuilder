/**
 * Content Studio Gateway
 * Routes requests to Content Studio through Coordinator with signatures
 * 
 * ACTIVE FLOW:
 * Learner AI → Course Builder → Content Studio → Build Course
 * 
 * Language field (if present) is forwarded from Learner AI payload to Content Studio.
 * Content Studio integration remains EXACTLY as implemented - no logic changes.
 */

import { postToCoordinator } from './coordinatorClient.js';
import contentStudioDTO from '../../dtoBuilders/contentStudioDTO.js';

/**
 * Send request to Content Studio via Coordinator
 * @param {Object} payloadObject - Payload object (will be converted to envelope)
 * @param {Object} payloadObject.learnerData - Learner data (learner_id, learner_name, learner_company)
 * @param {Array} payloadObject.skills - Skills array
 * @param {Array} payloadObject.learning_path - Learning path array (from Learner AI)
 * @param {string} payloadObject.language - Language code (optional, from Learner AI payload if present)
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
      // Override action and description only
      sendPayload.action = 'generate_course_content';
      sendPayload.description = 'Generate course content including topics, modules, and lessons based on learning path and skills';
    } else if (payloadObject.user_id || payloadObject.skills_raw_data || payloadObject.competency_target_name) {
      // CRITICAL: This is a Learner AI request - send payload AS-IS with ONLY action/description overridden
      // NO mappings, NO renaming, NO restructuring - Content Studio receives the same structure as Learner AI
      console.log('[ContentStudio Gateway] Detected Learner AI request - forwarding payload AS-IS');
      sendPayload = {
        ...payloadObject, // Copy ALL fields from Learner AI payload AS-IS
        action: payloadObject.action || 'generate_course_content', // Use existing action or override
        description: payloadObject.description || 'Generate course content from learning path' // Use existing description or override
      };
    } else {
      // Legacy path: Build payload using DTO (for other request types like marketplace courses)
      sendPayload = contentStudioDTO.buildSendPayload(
        payloadObject.learnerData || {},
        payloadObject.skills || []
      );

      // Forward additional fields from payloadObject (for marketplace courses and other flows)
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
      if (payloadObject.courseId) {
        sendPayload.courseId = payloadObject.courseId;
      }
      if (payloadObject.moduleId) {
        sendPayload.moduleId = payloadObject.moduleId;
      }
      if (payloadObject.topic) {
        sendPayload.topic = payloadObject.topic;
      }
      
      // Add action and description fields for Coordinator routing
      sendPayload.action = 'generate_course_content';
      sendPayload.description = 'Generate course content including topics, modules, and lessons based on learning path and skills';
    }

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
    console.log('\n[ContentStudio Gateway] ========== SENDING REQUEST TO CONTENT STUDIO ==========');
    console.log('[ContentStudio Gateway] Full Request Envelope:');
    console.log(JSON.stringify(envelope, null, 2));
    console.log('\n[ContentStudio Gateway] Payload Details:');
    console.log('- Action:', sendPayload.action);
    console.log('- Description:', sendPayload.description);
    console.log('- User ID:', sendPayload.user_id || sendPayload.learner_id || 'NOT SET');
    console.log('- User Name:', sendPayload.user_name || sendPayload.learner_name || 'NOT SET');
    console.log('- Company ID:', sendPayload.company_id || 'NOT SET');
    console.log('- Company Name:', sendPayload.company_name || 'NOT SET');
    console.log('- Preferred Language:', sendPayload.preferred_language || 'NOT SET');
    console.log('- Skills Raw Data:', sendPayload.skills_raw_data?.length || 0, 'skills');
    console.log('- Has Learning Path:', !!sendPayload.learning_path);
    if (sendPayload.learning_path) {
      console.log('  - Path Title:', sendPayload.learning_path.path_title || 'NOT SET');
      console.log('  - Total Duration Hours:', sendPayload.learning_path.total_estimated_duration_hours || 0);
      console.log('  - Learning Modules:', sendPayload.learning_path.learning_modules?.length || 0);
    }
    console.log('[ContentStudio Gateway] ===================================================\n');

    // Send via Coordinator
    const { data: json } = await postToCoordinator(envelope).catch(() => ({ data: {} }));
    
    // ========== LOG RAW RESPONSE FROM COORDINATOR (CONTENT STUDIO) ==========
    console.log('\n[ContentStudio Gateway] ========== RECEIVED RESPONSE FROM CONTENT STUDIO ==========');
    console.log('[ContentStudio Gateway] Full Response Object:');
    console.log(JSON.stringify(json, null, 2));
    console.log('\n[ContentStudio Gateway] Response Structure:');
    console.log('- Has response field:', !!json?.response);
    console.log('- Has success field:', !!json?.success);
    console.log('- Has data field:', !!json?.data);
    if (json?.response) {
      console.log('- Response keys:', Object.keys(json.response));
      if (json.response.course) {
        console.log('- Course count:', Array.isArray(json.response.course) ? json.response.course.length : 'NOT ARRAY');
        if (Array.isArray(json.response.course) && json.response.course.length > 0) {
          console.log('- First course has topics:', !!json.response.course[0]?.topics);
        }
      }
    }
    console.log('[ContentStudio Gateway] ===================================================\n');
    
    // Coordinator returns the envelope with filled response field
    // Extract response from envelope structure
    let result = json && json.response ? json.response : (json && json.success ? json.data : json);

    // ========== LOG EXTRACTED RESULT ==========
    console.log('\n[ContentStudio Gateway] ========== EXTRACTED RESULT (FINAL) ==========');
    console.log('[ContentStudio Gateway] Final Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n[ContentStudio Gateway] Result Summary:');
    console.log('- Has course:', !!result?.course);
    if (result?.course) {
      console.log('- Course array length:', Array.isArray(result.course) ? result.course.length : 'NOT ARRAY');
      if (Array.isArray(result.course) && result.course.length > 0) {
        console.log('- First course has topics:', !!result.course[0]?.topics);
        if (result.course[0]?.topics) {
          console.log('- Topics in first course:', Array.isArray(result.course[0].topics) ? result.course[0].topics.length : 'NOT ARRAY');
        }
      }
    }
    console.log('[ContentStudio Gateway] ===================================================\n');

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
