import { describe, it, expect } from '@jest/globals';
import { isPersonalizedCourseOwnedByLearner } from '../utils/personalizedCourseAccess.js';

describe('isPersonalizedCourseOwnedByLearner', () => {
  const learnerId = '82434584-f857-4ad2-87f3-83cbf66f1901';

  it('allows non-personalized courses regardless of owner', () => {
    expect(
      isPersonalizedCourseOwnedByLearner(
        { course_type: 'trainer', created_by_user_id: 'other-trainer' },
        learnerId
      )
    ).toBe(true);
  });

  it('allows learner_specific when owner matches (string-normalized)', () => {
    expect(
      isPersonalizedCourseOwnedByLearner(
        { course_type: 'learner_specific', created_by_user_id: learnerId },
        learnerId
      )
    ).toBe(true);
  });

  it('denies learner_specific owned by another user', () => {
    expect(
      isPersonalizedCourseOwnedByLearner(
        { course_type: 'learner_specific', created_by_user_id: '311b7e68-8150-4f5f-b787-8cecde706a39' },
        learnerId
      )
    ).toBe(false);
  });

  it('denies learner_specific with NULL owner', () => {
    expect(
      isPersonalizedCourseOwnedByLearner(
        { course_type: 'learner_specific', created_by_user_id: null },
        learnerId
      )
    ).toBe(false);
  });

  it('denies learner_specific when learner id is missing', () => {
    expect(
      isPersonalizedCourseOwnedByLearner(
        { course_type: 'learner_specific', created_by_user_id: learnerId },
        null
      )
    ).toBe(false);
  });

  it('denies when course is missing', () => {
    expect(isPersonalizedCourseOwnedByLearner(null, learnerId)).toBe(false);
  });
});
