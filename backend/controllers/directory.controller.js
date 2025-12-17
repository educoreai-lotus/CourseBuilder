/**
 * Directory Controller
 * @deprecated LEGACY_FLOW - Directory-triggered flow is currently inactive
 * 
 * PREVIOUS FLOW (DISABLED):
 * Directory → Course Builder → Learner AI → Content Studio → Course Builder
 * 
 * CURRENT ACTIVE FLOW:
 * Directory → Skills Engine → Learner AI → Course Builder → Content Studio → Build Course
 * 
 * Course Builder now accepts triggers ONLY from Learner AI, not from Directory.
 * This handler is preserved for potential future reactivation but is currently disabled.
 */

import { sendToLearnerAI } from '../services/gateways/learnerAIGateway.js';
import { sendToContentStudio } from '../services/gateways/contentStudioGateway.js';
import { handleContentStudioIntegration } from '../integration/handlers/contentStudioHandler.js';
import { getFallbackData, shouldUseFallback } from '../integration/fallbackData.js';
import courseRepository from '../repositories/CourseRepository.js';
import registrationRepository from '../repositories/RegistrationRepository.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * @deprecated LEGACY_FLOW
 * Handle Directory trigger for learning path creation
 * POST /api/v1/directory/trigger-learning-path
 * 
 * ⚠️ THIS FLOW IS CURRENTLY INACTIVE
 * Directory-triggered flow is disabled. Course Builder now accepts triggers ONLY from Learner AI.
 * 
 * Request body (LEGACY - not currently processed):
 * {
 *   "learner_id": "uuid",
 *   "learner_name": "string",
 *   "learner_company": "string",
 *   "tag": "competency | learning-path-name | etc",
 *   "language": "en/he/...",
 *   "trainer_id": "uuid" (optional),
 *   "trainer_name": "string" (optional)
 * }
 */
export const handleDirectoryTrigger = async (req, res, next) => {
  // ⚠️ LEGACY_FLOW: Directory-triggered flow is currently inactive
  // Course Builder now accepts triggers ONLY from Learner AI
  return res.status(410).json({
    error: 'Directory-triggered flow is currently inactive',
    message: 'Course Builder now accepts triggers only from Learner AI. The active flow is: Directory → Skills Engine → Learner AI → Course Builder → Content Studio → Build Course',
    legacy_endpoint: '/api/v1/directory/trigger-learning-path',
    active_flow: 'Learner AI → Course Builder (via Coordinator POST /api/fill-content-metrics)'
  });

  /* LEGACY CODE - PRESERVED FOR POTENTIAL FUTURE REACTIVATION
  try {
    const {
      learner_id,
      learner_name,
      learner_company,
      tag,
      language = 'en',
      trainer_id,
      trainer_name
    } = req.body;

    // Validate required fields
    if (!learner_id || !tag) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'learner_id and tag are required'
      });
    }

    console.log('[Directory Trigger] Received request:', {
      learner_id,
      learner_name,
      tag,
      language,
      has_trainer: !!trainer_id
    });

    // Step 1: Call Learner AI via Coordinator
    // Send: { learner_id, tag }
    console.log('[Directory Trigger] Calling Learner AI via Coordinator...');
    let learnerAIResponse;
    try {
      learnerAIResponse = await sendToLearnerAI({
        user_id: learner_id,
        tag: tag
      });
      console.log('[Directory Trigger] Learner AI returned learning_path:', 
        learnerAIResponse.learning_path?.length || 0);
    } catch (learnerAIError) {
      console.error('[Directory Trigger] Learner AI call failed:', learnerAIError.message);
      
      // If Learner AI fails, use fallback data
      if (shouldUseFallback(learnerAIError, 'LearnerAI')) {
        console.warn('[Directory Trigger] Using fallback data for Learner AI');
        const fallback = getFallbackData('LearnerAI', 'learner_specific');
        learnerAIResponse = {
          user_id: learner_id,
          user_name: learner_name,
          company_name: learner_company || '',
          skills: fallback.skills || [],
          learning_path: fallback.learning_path || []
        };
      } else {
        throw learnerAIError;
      }
    }

    // Extract learning_path and skills from Learner AI response
    const learningPath = learnerAIResponse.learning_path || [];
    const skills = learnerAIResponse.skills || [];

    if (!learningPath || learningPath.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Learner AI did not return a valid learning_path'
      });
    }

    // Step 2: Call Content Studio via Coordinator
    // Send: { learner details, learning_path, language, trainer details (if provided) }
    console.log('[Directory Trigger] Calling Content Studio via Coordinator...');
    
    const contentStudioPayload = {
      learnerData: {
        learner_id: learner_id,
        learner_name: learner_name || learnerAIResponse.user_name,
        learner_company: learner_company || learnerAIResponse.company_name || ''
      },
      skills: skills,
      learning_path: learningPath,
      language: language
    };

    // Include trainer details if provided
    if (trainer_id && trainer_name) {
      contentStudioPayload.trainerData = {
        trainer_id: trainer_id,
        trainer_name: trainer_name
      };
    }

    let contentStudioResponse;
    try {
      contentStudioResponse = await sendToContentStudio(contentStudioPayload);
      console.log('[Directory Trigger] Content Studio returned topics:', 
        contentStudioResponse.topics?.length || contentStudioResponse.course?.length || 0);
    } catch (contentStudioError) {
      console.error('[Directory Trigger] Content Studio call failed:', contentStudioError.message);
      
      // If Content Studio fails, use fallback data
      if (shouldUseFallback(contentStudioError, 'ContentStudio')) {
        console.warn('[Directory Trigger] Using fallback data for Content Studio');
        const fallback = getFallbackData('ContentStudio', 'learner_specific');
        contentStudioResponse = {
          learner_id: learner_id,
          learner_name: learner_name || learnerAIResponse.user_name,
          learner_company: learner_company || learnerAIResponse.company_name || '',
          topics: fallback.topics || []
        };
      } else {
        throw contentStudioError;
      }
    }

    // Step 3: Create course structure using Content Studio handler
    // The Content Studio handler will create the course, topics, modules, and lessons
    let courseId;
    if (contentStudioResponse.topics && contentStudioResponse.topics.length > 0) {
      console.log('[Directory Trigger] Creating course structure from Content Studio response...');
      
      const contentStudioPayloadForHandler = {
        learner_id: learner_id,
        learner_name: learner_name || learnerAIResponse.user_name,
        learner_company: learner_company || learnerAIResponse.company_name || '',
        skills: skills,
        topics: contentStudioResponse.topics
      };

      // Include trainer details if provided
      if (trainer_id && trainer_name) {
        contentStudioPayloadForHandler.trainer_id = trainer_id;
        contentStudioPayloadForHandler.trainer_name = trainer_name;
      }

      const contentStudioResponseTemplate = {
        learner_id: learner_id,
        learner_name: learner_name || learnerAIResponse.user_name,
        learner_company: learner_company || learnerAIResponse.company_name || '',
        topics: contentStudioResponse.topics
      };

      // Create the course structure (this will create course, topics, modules, lessons)
      await handleContentStudioIntegration(
        contentStudioPayloadForHandler,
        contentStudioResponseTemplate
      );
      
      // Get the created course ID
      // Since handleContentStudioIntegration doesn't return the course, we need to find it
      // We'll search by learner_id in the course metadata
      const courses = await courseRepository.findAll();
      const createdCourse = courses.find(c => 
        c.created_by_user_id === learner_id && 
        c.course_type === 'learner_specific' &&
        c.status === 'draft'
      );
      
      courseId = createdCourse?.id || null;
      
      console.log('[Directory Trigger] Course structure created successfully');
    } else if (contentStudioResponse.course && Array.isArray(contentStudioResponse.course) && contentStudioResponse.course.length > 0) {
      // Alternative format: Content Studio returns course array directly
      courseId = contentStudioResponse.course[0].course_id;
    } else {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Content Studio did not return valid course data'
      });
    }

    // Step 4: Auto-create registration for the learner
    if (courseId && learner_id) {
      try {
        // Check if registration already exists
        const existingRegistration = await registrationRepository.findByLearnerAndCourse(learner_id, courseId);
        
        if (!existingRegistration) {
          await registrationRepository.create({
            learner_id: learner_id,
            learner_name: learner_name || learnerAIResponse.user_name,
            course_id: courseId,
            company_name: learner_company || learnerAIResponse.company_name || '',
            status: 'in_progress'
          });

          // Update course studentsIDDictionary
          const course = await courseRepository.findById(courseId);
          if (course) {
            const studentsDict = course.studentsIDDictionary || {};
            studentsDict[learner_id] = {
              status: 'in_progress',
              enrolled_date: new Date().toISOString(),
              completed_date: null,
              completion_reason: null
            };
            await courseRepository.update(courseId, { studentsIDDictionary: studentsDict });
          }
        }
      } catch (regError) {
        console.warn('[Directory Trigger] Could not create registration:', regError.message);
        // Don't fail the request if registration fails
      }
    }

    // Step 5: Return course info
    const course = courseId ? await courseRepository.findById(courseId) : null;
    
    return res.status(201).json({
      status: 'created',
      course_id: courseId,
      course_name: course?.course_name || 'Personalized Course',
      course_type: 'learner_specific',
      learner_id: learner_id,
      ...(trainer_id && { trainer_id: trainer_id }),
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Directory Trigger] Error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      error: status === 500 ? 'Internal Server Error' : 'Error',
      message: error.message || 'Failed to create learning path course'
    });
  }
  */
};

export default {
  handleDirectoryTrigger
};

