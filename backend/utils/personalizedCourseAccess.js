/**
 * Learner-facing personalized-course ownership ACL.
 * Non-personalized courses are unchanged (always allowed here).
 * learner_specific courses require created_by_user_id === trusted learner id.
 * Fail closed on missing learner id or NULL owner.
 */

export function isPersonalizedCourseOwnedByLearner(course, learnerId) {
  if (!course) {
    return false;
  }

  if (course.course_type !== 'learner_specific') {
    return true;
  }

  if (learnerId == null || String(learnerId).trim() === '') {
    return false;
  }

  if (course.created_by_user_id == null || String(course.created_by_user_id).trim() === '') {
    return false;
  }

  return String(course.created_by_user_id) === String(learnerId);
}
