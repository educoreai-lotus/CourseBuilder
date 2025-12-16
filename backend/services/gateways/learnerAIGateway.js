/**
 * Learner AI Gateway
 * Routes requests to Learner AI through Coordinator with signatures
 * NEW FLOW: Course Builder calls Learner AI with company and learners array
 */

import { postToCoordinator } from './coordinatorClient.js';

/**
 * Send request to Learner AI via Coordinator
 * @param {Object} payloadObject - Payload object with company and learners
 * @param {string} payloadObject.company_id - Company ID (required)
 * @param {string} payloadObject.company_name - Company name (required)
 * @param {string} payloadObject.learning_flow - Learning flow (default: "career_path_driven")
 * @param {Array} payloadObject.learners - Array of learners with learner_id, learner_name, preferred_language (required)
 * @returns {Promise<Object>} Response payload object with learning_path and skills
 */
export async function sendToLearnerAI(payloadObject = {}) {
  try {
    // Build payload object for NEW flow
    // Directory → Course Builder → Learner AI
    // Course Builder sends: { company_id, company_name, learning_flow, learners[] }
    const sendPayload = {
      company_id: payloadObject.company_id || null,
      company_name: payloadObject.company_name || null,
      learning_flow: payloadObject.learning_flow || 'career_path_driven',
      learners: Array.isArray(payloadObject.learners) ? payloadObject.learners : []
    };

    // Add action and description fields for Coordinator routing
    // This is the canonical contract for batch career path generation
    sendPayload.action = 'get_batch_career_paths';
    sendPayload.description = 'Get batch career learning paths for multiple learners in a company for CAREER_PATH_DRIVEN flow from Learner AI service';

    // Validate required fields
    if (!sendPayload.company_id) {
      throw new Error('company_id is required for Learner AI request');
    }
    if (!sendPayload.company_name) {
      throw new Error('company_name is required for Learner AI request');
    }
    if (!Array.isArray(sendPayload.learners) || sendPayload.learners.length === 0) {
      throw new Error('learners array is required and must not be empty for Learner AI request');
    }
    
    // Validate each learner has required fields
    for (let i = 0; i < sendPayload.learners.length; i++) {
      const learner = sendPayload.learners[i];
      if (!learner.learner_id) {
        throw new Error(`Learner at index ${i} is missing learner_id`);
      }
      if (!learner.learner_name) {
        throw new Error(`Learner at index ${i} is missing learner_name`);
      }
      if (!learner.preferred_language) {
        throw new Error(`Learner at index ${i} is missing preferred_language`);
      }
    }

    // Build response template (empty, Learner AI will fill it)
    // Learner AI returns wrapped JSON with career_learning_paths[]
    const responseTemplate = {};

    // Build envelope for Coordinator
    const envelope = {
      requester_service: 'course-builder-service',
      payload: sendPayload,
      response: responseTemplate
    };
    
    console.log('[LearnerAI Gateway] Sending request to Learner AI:', {
      company_id: sendPayload.company_id,
      company_name: sendPayload.company_name,
      learning_flow: sendPayload.learning_flow,
      learners_count: sendPayload.learners.length
    });

    // Send via Coordinator
    const { data: json } = await postToCoordinator(envelope).catch(() => ({ data: {} }));
    
    // ========== LOG RAW RESPONSE FROM COORDINATOR ==========
    console.log('[LearnerAI Gateway] ========== RAW RESPONSE FROM COORDINATOR ==========');
    console.log('[LearnerAI Gateway] Full response object:', JSON.stringify(json, null, 2));
    console.log('[LearnerAI Gateway] Response type:', typeof json);
    console.log('[LearnerAI Gateway] Response keys:', json ? Object.keys(json) : 'null/undefined');
    console.log('[LearnerAI Gateway] Has response field:', !!json?.response);
    console.log('[LearnerAI Gateway] Has success field:', !!json?.success);
    console.log('[LearnerAI Gateway] Has data field:', !!json?.data);
    if (json?.response) {
      console.log('[LearnerAI Gateway] response.answer type:', typeof json.response.answer);
      console.log('[LearnerAI Gateway] response.answer is string:', typeof json.response.answer === 'string');
      if (json.response.answer && typeof json.response.answer === 'string') {
        console.log('[LearnerAI Gateway] response.answer length:', json.response.answer.length);
        console.log('[LearnerAI Gateway] response.answer preview (first 500 chars):', json.response.answer.substring(0, 500));
      }
      console.log('[LearnerAI Gateway] response keys:', Object.keys(json.response));
    }
    console.log('[LearnerAI Gateway] ===================================================');
    
    // Coordinator returns the envelope with filled response field
    // Handle different response structures:
    // 1. Envelope format: { response: { ... } }
    // 2. Direct format: { success: true, data: { ... } }
    // 3. Direct format: { data: { ... } }
    let result = json && json.response ? json.response : (json && json.success ? json.data : json);
    
    console.log('[LearnerAI Gateway] ========== EXTRACTED RESULT (BEFORE PARSING) ==========');
    console.log('[LearnerAI Gateway] Result type:', typeof result);
    console.log('[LearnerAI Gateway] Result keys:', result ? Object.keys(result) : 'null/undefined');
    console.log('[LearnerAI Gateway] Result preview:', JSON.stringify(result, null, 2).substring(0, 1000));
    console.log('[LearnerAI Gateway] ===================================================');
    
    // Learner AI currently returns the real payload as a JSON string in response.answer
    // Example: { response: { answer: "{\"success\":true,\"action\":\"get_batch_career_paths\",...}" } }
    if (result && typeof result.answer === 'string') {
      console.log('[LearnerAI Gateway] Parsing response.answer as JSON string...');
      try {
        const parsed = JSON.parse(result.answer);
        console.log('[LearnerAI Gateway] Parsed successfully. Parsed keys:', Object.keys(parsed));
        console.log('[LearnerAI Gateway] Parsed preview:', JSON.stringify(parsed, null, 2).substring(0, 1000));
        
        // If parsed has a data field (batch format), use parsed.data so that
        // fillContentMetrics sees { company_id, company_name, learning_flow, learners_data: [...] }
        if (parsed && parsed.data) {
          console.log('[LearnerAI Gateway] Using parsed.data (batch format)');
          result = parsed.data;
        } else {
          console.log('[LearnerAI Gateway] Using parsed directly');
          result = parsed;
        }
      } catch (parseError) {
        console.error('[LearnerAI Gateway] Failed to parse response.answer JSON:', parseError);
        console.error('[LearnerAI Gateway] Parse error details:', {
          message: parseError.message,
          stack: parseError.stack
        });
        // Fall back to original result (will be validated later)
      }
    } else if (result && result.data && result.data.learners_data) {
      // Fallback: if Coordinator already unwrapped to { success, data }, use data directly
      console.log('[LearnerAI Gateway] Using result.data (already unwrapped)');
      result = result.data;
    }

    // ========== LOG FINAL RESULT ==========
    console.log('[LearnerAI Gateway] ========== FINAL RESULT (RETURNING TO FILL CONTENT METRICS) ==========');
    console.log('[LearnerAI Gateway] Final result type:', typeof result);
    console.log('[LearnerAI Gateway] Final result keys:', result ? Object.keys(result) : 'null/undefined');
    console.log('[LearnerAI Gateway] Final result full:', JSON.stringify(result, null, 2));
    console.log('[LearnerAI Gateway] Has learners_data:', !!result?.learners_data);
    console.log('[LearnerAI Gateway] Has career_learning_paths:', !!result?.career_learning_paths);
    if (result?.learners_data) {
      console.log('[LearnerAI Gateway] learners_data length:', result.learners_data.length);
    }
    if (result?.career_learning_paths) {
      console.log('[LearnerAI Gateway] career_learning_paths length:', result.career_learning_paths.length);
    }
    console.log('[LearnerAI Gateway] ===================================================');

    // Return response data (should contain structured Learning Path JSON or batch data.learners_data)
    return result;
  } catch (error) {
    console.error('[LearnerAI Gateway] Error:', error);
    throw error;
  }
}

export default {
  sendToLearnerAI
};
