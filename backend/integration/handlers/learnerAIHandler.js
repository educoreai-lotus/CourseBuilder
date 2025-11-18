/**
 * Learner AI Integration Handler
 * Handles incoming data from Learner AI microservice
 * Flow: Learner AI → Course Builder → Content Studio → Course Builder (creates course)
 */

import learnerAIDTO from '../../dtoBuilders/learnerAIDTO.js';
import { sendToContentStudio } from '../clients/contentStudioClient.js';
import { handleContentStudioIntegration } from './contentStudioHandler.js';
import { getFallbackData, shouldUseFallback } from '../fallbackData.js';

/**
 * Handle Learner AI integration request
 * @param {Object} payloadObject - Parsed payload from Learner AI
 * @param {Object} responseTemplate - Empty response template to fill
 * @returns {Promise<Object>} Filled response object matching contract
 */
export async function handleLearnerAIIntegration(payloadObject, responseTemplate) {
  try {
    // Normalize Learner AI payload
    const data = learnerAIDTO.buildFromReceived(payloadObject);

    console.log('[LearnerAI Handler] Received from Learner AI:', {
      user_id: data.user_id,
      user_name: data.user_name,
      skills: data.skills,
      competency_name: data.competency_name
    });

    // Step 1: Call Content Studio to generate personalized lessons
    // Content Studio needs: learner_id, learner_name, learner_company, skills
    console.log('[LearnerAI Handler] Calling Content Studio to generate lessons...');
    
    const contentStudioPayload = {
      learnerData: {
        learner_id: data.user_id, // Learner AI user_id = Content Studio learner_id
        learner_name: data.user_name,
        learner_company: data.company_name || ''
      },
      skills: data.skills || []
    };

    let contentStudioResponse;
    try {
      contentStudioResponse = await sendToContentStudio(contentStudioPayload);
      console.log('[LearnerAI Handler] Content Studio returned topics:', 
        contentStudioResponse.topics?.length || 0);
    } catch (contentStudioError) {
      console.error('[LearnerAI Handler] Content Studio call failed:', contentStudioError.message);
      
      // If Content Studio fails, use fallback data
      if (shouldUseFallback(contentStudioError, 'ContentStudio')) {
        console.warn('[LearnerAI Handler] Using fallback data for Content Studio');
        const fallback = getFallbackData('ContentStudio', 'learner_specific');
        contentStudioResponse = {
          learner_id: data.user_id,
          learner_name: data.user_name,
          learner_company: data.company_name || '',
          topics: fallback.topics || []
        };
      } else {
        throw contentStudioError;
      }
    }

    // Step 2: Create course structure using Content Studio handler
    // The Content Studio handler will create the course, topics, modules, and lessons
    if (contentStudioResponse.topics && contentStudioResponse.topics.length > 0) {
      console.log('[LearnerAI Handler] Creating course structure from Content Studio response...');
      
      const contentStudioResponseTemplate = {
        learner_id: contentStudioResponse.learner_id || data.user_id,
        learner_name: contentStudioResponse.learner_name || data.user_name,
        learner_company: contentStudioResponse.learner_company || data.company_name || '',
        topics: contentStudioResponse.topics
      };

      // Create the course structure (this will create course, topics, modules, lessons)
      await handleContentStudioIntegration(
        {
          learner_id: contentStudioResponse.learner_id || data.user_id,
          learner_name: contentStudioResponse.learner_name || data.user_name,
          learner_company: contentStudioResponse.learner_company || data.company_name || '',
          skills: data.skills || [],
          topics: contentStudioResponse.topics
        },
        contentStudioResponseTemplate
      );
      
      console.log('[LearnerAI Handler] Course structure created successfully');
    }

    // Step 3: Fill response template with Learner AI contract fields
    responseTemplate.user_id = data.user_id;
    responseTemplate.user_name = data.user_name || '';
    responseTemplate.company_id = data.company_id || null;
    responseTemplate.company_name = data.company_name || null;
    responseTemplate.skills = data.skills || [];
    responseTemplate.competency_name = data.competency_name || null;
    
    // Return the filled response template
    return responseTemplate;
  } catch (error) {
    console.error('[LearnerAI Handler] Error:', error);
    
    // Check if we should use fallback data (network/service errors)
    if (shouldUseFallback(error, 'LearnerAI')) {
      console.warn('[LearnerAI Handler] Using fallback data due to service unavailability');
      const fallback = getFallbackData('LearnerAI');
      
      responseTemplate.user_id = fallback.user_id || payloadObject.user_id || '';
      responseTemplate.user_name = fallback.user_name || payloadObject.user_name || '';
      responseTemplate.company_id = fallback.company_id || payloadObject.company_id || null;
      responseTemplate.company_name = fallback.company_name || payloadObject.company_name || null;
      responseTemplate.skills = fallback.skills || payloadObject.skills || [];
      responseTemplate.competency_name = fallback.competency_name || payloadObject.competency_name || null;
      
      return responseTemplate;
    }
    
    // For non-network errors, use payload data
    try {
      responseTemplate.user_id = payloadObject.user_id || '';
      responseTemplate.user_name = payloadObject.user_name || '';
      responseTemplate.company_id = payloadObject.company_id || null;
      responseTemplate.company_name = payloadObject.company_name || null;
      responseTemplate.skills = payloadObject.skills || [];
      responseTemplate.competency_name = payloadObject.competency_name || null;
      
      return responseTemplate;
    } catch (fallbackError) {
      // Last resort: use mock fallback data
      const fallback = getFallbackData('LearnerAI');
      return {
        user_id: fallback.user_id || '',
        user_name: fallback.user_name || '',
        company_id: fallback.company_id || null,
        company_name: fallback.company_name || null,
        skills: fallback.skills || [],
        competency_name: fallback.competency_name || null
      };
    }
  }
}

export default {
  handleLearnerAIIntegration
};

