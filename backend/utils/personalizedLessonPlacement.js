/**
 * Personalized Learner AI inbound lesson placement.
 * Content Studio returns one course[0] with topics flattened in
 * RAW learning_modules[] array order → steps[] array order.
 * Caller must pass learning_modules in that same raw order (do not sort by module_order).
 * Slice consecutive topics using each module's steps.length.
 */

export function getExpectedStepCount(learningModules) {
  if (!Array.isArray(learningModules)) {
    const error = new Error('learning_modules must be an array');
    error.status = 400;
    throw error;
  }

  let total = 0;
  for (let i = 0; i < learningModules.length; i++) {
    const learningModule = learningModules[i];
    if (!Array.isArray(learningModule?.steps)) {
      const error = new Error(
        `learning_module at index ${i} must have steps as an array`
      );
      error.status = 400;
      throw error;
    }
    total += learningModule.steps.length;
  }
  return total;
}

/**
 * Single-path CS contract: response.course.length === 1, topics on course[0].
 */
export function extractSinglePathTopics(contentStudioResponse) {
  if (!contentStudioResponse || typeof contentStudioResponse !== 'object') {
    const error = new Error('Content Studio response is missing or unusable');
    error.status = 502;
    throw error;
  }

  const courseArray = contentStudioResponse.course;
  if (!Array.isArray(courseArray) || courseArray.length === 0) {
    const error = new Error(
      'Content Studio response.course is missing or empty'
    );
    error.status = 502;
    throw error;
  }

  if (courseArray.length !== 1) {
    const error = new Error(
      `Content Studio response.course.length must be 1 for a single learning path, got ${courseArray.length}`
    );
    error.status = 502;
    throw error;
  }

  const topics = courseArray[0]?.topics;
  if (!Array.isArray(topics)) {
    const error = new Error(
      'Content Studio course[0].topics is missing or not an array'
    );
    error.status = 502;
    throw error;
  }

  return topics;
}

export function assertTopicCountMatchesSteps(topics, learningModules) {
  const expectedTopicCount = getExpectedStepCount(learningModules);
  const actualTopicCount = Array.isArray(topics) ? topics.length : 0;

  if (actualTopicCount !== expectedTopicCount) {
    const error = new Error(
      `Content Studio topic count (${actualTopicCount}) does not match expected step count (${expectedTopicCount})`
    );
    error.status = 502;
    throw error;
  }

  return expectedTopicCount;
}

/**
 * Walk learning_modules in the given order (must be CS raw array order).
 * Consume consecutive CS topics per steps.length.
 * Does not use course[i] → module[i] and does not sort by module_order.
 */
export function sliceTopicsByModuleSteps(topics, learningModules) {
  assertTopicCountMatchesSteps(topics, learningModules);

  let cursor = 0;
  return learningModules.map((learningModule, moduleIndex) => {
    const stepCount = learningModule.steps.length;
    const moduleTopics = topics.slice(cursor, cursor + stepCount);
    cursor += stepCount;
    return {
      moduleIndex,
      stepCount,
      topics: moduleTopics
    };
  });
}
