/**
 * Course completion interpretation for learners.
 * A course is completed when registration is already completed OR
 * the learner has a passed postcourse assessment on record.
 */

export function hasPassedPostcourseAssessment(assessment) {
  return Boolean(
    assessment &&
    assessment.exam_type === 'postcourse' &&
    assessment.passed === true
  );
}

/**
 * @param {Object} params
 * @param {string|null|undefined} params.registrationStatus
 * @param {Object|null|undefined} params.assessment - row or DTO with exam_type and passed
 * @param {number} params.lessonBasedProgress - 0-100 from lesson_completion_dictionary
 * @returns {{ progress: number, status: string }}
 */
export function resolveLearnerCourseProgress({
  registrationStatus,
  assessment,
  lessonBasedProgress
}) {
  const lessonProgress = Number.isFinite(lessonBasedProgress)
    ? Number(lessonBasedProgress)
    : 0;

  const isCompleted =
    registrationStatus === 'completed' || hasPassedPostcourseAssessment(assessment);

  if (isCompleted) {
    return {
      progress: 100,
      status: 'completed'
    };
  }

  return {
    progress: Number(lessonProgress.toFixed(2)),
    status: registrationStatus || 'in_progress'
  };
}
