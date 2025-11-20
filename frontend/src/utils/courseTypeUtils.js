/**
 * Course Type Utilities
 * Proper detection of personalized vs marketplace courses
 */

/**
 * Check if a course is personalized
 * Personalized courses:
 * - course_type === 'learner_specific'
 * - OR metadata.personalized === true
 * - OR metadata.source === 'learner_ai'
 * 
 * @param {Object} course - Course object
 * @returns {boolean} - True if course is personalized
 */
export function isPersonalized(course) {
  if (!course) return false
  
  // Primary check: course_type
  if (course.course_type === 'learner_specific') {
    return true
  }
  
  // Secondary check: metadata
  const metadata = course.metadata || {}
  if (metadata.personalized === true || metadata.source === 'learner_ai') {
    return true
  }
  
  return false
}

/**
 * Check if a course is a marketplace course
 * Marketplace courses:
 * - NOT personalized
 * - AND course_type === 'trainer'
 * 
 * @param {Object} course - Course object
 * @returns {boolean} - True if course is marketplace
 */
export function isMarketplace(course) {
  if (!course) return false
  
  // Must be trainer course type
  if (course.course_type !== 'trainer') {
    return false
  }
  
  // Must not be personalized (check inline to avoid circular dependency issues)
  const metadata = course.metadata || {}
  if (metadata.personalized === true || metadata.source === 'learner_ai') {
    return false
  }
  
  return true
}

/**
 * Check if a course belongs to a specific trainer
 * Trainer ownership:
 * - course_type === 'trainer'
 * - AND created_by_user_id === trainerId
 * 
 * @param {Object} course - Course object
 * @param {string} trainerId - Trainer user ID
 * @returns {boolean} - True if course belongs to trainer
 */
export function belongsToTrainer(course, trainerId) {
  if (!course || !trainerId) return false
  
  // Must be marketplace course
  if (!isMarketplace(course)) {
    return false
  }
  
  // Check ownership
  return course.created_by_user_id === trainerId || course.created_by === trainerId
}

/**
 * Filter courses to show only marketplace courses
 * 
 * @param {Array} courses - Array of course objects
 * @returns {Array} - Filtered marketplace courses
 */
export function filterMarketplaceCourses(courses) {
  if (!Array.isArray(courses)) return []
  return courses.filter(course => isMarketplace(course))
}

/**
 * Filter courses to show only personalized courses
 * 
 * @param {Array} courses - Array of course objects
 * @returns {Array} - Filtered personalized courses
 */
export function filterPersonalizedCourses(courses) {
  if (!Array.isArray(courses)) return []
  return courses.filter(course => isPersonalized(course))
}

/**
 * Filter courses to show only trainer's marketplace courses
 * 
 * @param {Array} courses - Array of course objects
 * @param {string} trainerId - Trainer user ID
 * @returns {Array} - Filtered trainer courses
 */
export function filterTrainerCourses(courses, trainerId) {
  if (!Array.isArray(courses)) return []
  return courses.filter(course => belongsToTrainer(course, trainerId))
}
