/**
 * Assessment Controller
 * Handles assessment creation requests from frontend
 */

import { sendToAssessment } from '../services/gateways/assessmentGateway.js';
import courseRepository from '../repositories/CourseRepository.js';

/**
 * Start assessment for a learner
 * POST /api/v1/courses/:id/assessment/start
 * 
 * Request body (optional - uses headers if not provided):
 * {
 *   "learner_id": "uuid" (optional, from X-User-Id header),
 *   "learner_name": "string" (optional, from X-User-Name header)
 * }
 * 
 * Response:
 * {
 *   "assessment_session_id": "uuid",
 *   "redirect_url": "string",
 *   "expires_in": 900
 * }
 */
export const startAssessment = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const learnerId = req.body.learner_id || req.headers['x-user-id'] || req.headers['X-User-Id'];
    const learnerName = req.body.learner_name || req.headers['x-user-name'] || req.headers['X-User-Name'];

    // Validate required fields
    if (!courseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    if (!learnerId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Learner ID is required (provide in body or X-User-Id header)'
      });
    }

    // Get course
    const course = await courseRepository.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Course not found'
      });
    }

    console.log('[Assessment Controller] Starting assessment:', {
      courseId,
      courseName: course.course_name,
      learnerId,
      learnerName
    });

    // Send request to Assessment service via Coordinator
    // Flow: Course Builder → Coordinator → Assessment Service
    console.log('[Assessment Controller] Routing request through Coordinator to Assessment service...');
    const assessmentResponse = await sendToAssessment(
      course,
      learnerId,
      learnerName || 'Learner'
    );
    
    console.log('[Assessment Controller] Received response from Assessment service via Coordinator:', {
      has_redirect_url: !!assessmentResponse?.redirect_url,
      has_assessment_session_id: !!assessmentResponse?.assessment_session_id
    });

    // Assessment service should return redirect_url and assessment_session_id
    // If it doesn't, we'll provide a fallback
    if (assessmentResponse && assessmentResponse.redirect_url) {
      return res.status(200).json({
        assessment_session_id: assessmentResponse.assessment_session_id || assessmentResponse.learner_id,
        redirect_url: assessmentResponse.redirect_url,
        expires_in: assessmentResponse.expires_in || 900
      });
    }

    // Fallback response if Assessment service doesn't return redirect_url
    // This might happen if Assessment service is not fully integrated yet
    console.warn('[Assessment Controller] Assessment service did not return redirect_url, using fallback');
    return res.status(200).json({
      assessment_session_id: assessmentResponse.learner_id || learnerId,
      redirect_url: assessmentResponse.redirect_url || `/course/${courseId}/assessment/complete`,
      expires_in: 900,
      message: 'Assessment session created. Redirect URL may need to be configured.'
    });
  } catch (error) {
    console.error('[Assessment Controller] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to start assessment'
    });
  }
};

export const assessmentController = {
  startAssessment
};

export default assessmentController;

