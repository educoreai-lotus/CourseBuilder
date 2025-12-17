/**
 * Learner AI Integration Handler
 * Handles incoming data from Learner AI microservice (via Coordinator)
 * 
 * ACTIVE FLOW (CURRENT):
 * Directory → Skills Engine → Learner AI → Course Builder → Content Studio → Build Course
 * 
 * This is the PRIMARY entry point for Course Builder.
 * Learner AI sends requests TO Course Builder via Coordinator (POST /api/fill-content-metrics).
 * Course Builder then calls Content Studio and builds the course.
 * 
 * NOTE: Course Builder NO LONGER calls Learner AI. Learner AI is the trigger source.
 */

import learnerAIDTO from '../../dtoBuilders/learnerAIDTO.js';
import { sendToContentStudio } from '../../services/gateways/contentStudioGateway.js';
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

    // Learner AI → Course Builder is one-way communication
    // Course Builder processes the request and creates course, no response needed
    return {};  // ✅ Empty response for Learner AI (one-way)
  } catch (error) {
    console.error('[LearnerAI Handler] Error:', error);
    
    // Learner AI is one-way communication, return empty response even on error
    return {};  // ✅ Empty response for Learner AI (one-way)
  }
}

export default {
  handleLearnerAIIntegration
};

