import {
  isPersonalized,
  isPersonalizedForLearner,
  filterPersonalizedCoursesForLearner
} from '../courseTypeUtils.js'

describe('personalized course owner helpers', () => {
  const learnerId = 'learner-1'

  test('isPersonalized still means type/metadata only', () => {
    expect(
      isPersonalized({ course_type: 'learner_specific', created_by_user_id: 'someone-else' })
    ).toBe(true)
  })

  test('isPersonalizedForLearner requires matching owner', () => {
    expect(
      isPersonalizedForLearner(
        { course_type: 'learner_specific', created_by_user_id: learnerId },
        learnerId
      )
    ).toBe(true)
    expect(
      isPersonalizedForLearner(
        { course_type: 'learner_specific', created_by_user_id: 'other' },
        learnerId
      )
    ).toBe(false)
    expect(
      isPersonalizedForLearner({ course_type: 'trainer', created_by_user_id: learnerId }, learnerId)
    ).toBe(false)
  })

  test('filterPersonalizedCoursesForLearner drops foreign personalized courses', () => {
    const courses = [
      { id: 'mine', course_type: 'learner_specific', created_by_user_id: learnerId },
      { id: 'theirs', course_type: 'learner_specific', created_by_user_id: 'other' },
      { id: 'market', course_type: 'trainer', created_by_user_id: 'trainer' }
    ]
    expect(filterPersonalizedCoursesForLearner(courses, learnerId).map((c) => c.id)).toEqual(['mine'])
  })
})
