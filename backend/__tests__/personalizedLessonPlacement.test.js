import { describe, it, expect } from '@jest/globals';
import {
  getExpectedStepCount,
  extractSinglePathTopics,
  assertTopicCountMatchesSteps,
  sliceTopicsByModuleSteps
} from '../utils/personalizedLessonPlacement.js';

const modulesTwoByTwo = [
  { module_order: 1, module_title: 'Module 1', steps: [{ title: 'A' }, { title: 'B' }] },
  { module_order: 2, module_title: 'Module 2', steps: [{ title: 'C' }, { title: 'D' }] }
];

const topicsABCD = [
  { topic_name: 'A' },
  { topic_name: 'B' },
  { topic_name: 'C' },
  { topic_name: 'D' }
];

describe('personalizedLessonPlacement', () => {
  it('slices 2+2 steps onto two modules from flattened CS topics', () => {
    const slices = sliceTopicsByModuleSteps(topicsABCD, modulesTwoByTwo);

    expect(slices).toHaveLength(2);
    expect(slices[0].topics.map((t) => t.topic_name)).toEqual(['A', 'B']);
    expect(slices[1].topics.map((t) => t.topic_name)).toEqual(['C', 'D']);
  });

  it('slices 1+3+2 steps onto three modules', () => {
    const modules = [
      { module_order: 1, steps: [{ title: 'A' }] },
      { module_order: 2, steps: [{ title: 'B' }, { title: 'C' }, { title: 'D' }] },
      { module_order: 3, steps: [{ title: 'E' }, { title: 'F' }] }
    ];
    const topics = [
      { topic_name: 'A' },
      { topic_name: 'B' },
      { topic_name: 'C' },
      { topic_name: 'D' },
      { topic_name: 'E' },
      { topic_name: 'F' }
    ];

    const slices = sliceTopicsByModuleSteps(topics, modules);

    expect(slices[0].topics.map((t) => t.topic_name)).toEqual(['A']);
    expect(slices[1].topics.map((t) => t.topic_name)).toEqual(['B', 'C', 'D']);
    expect(slices[2].topics.map((t) => t.topic_name)).toEqual(['E', 'F']);
  });

  it('fails when CS returns fewer topics than total steps', () => {
    expect(() => sliceTopicsByModuleSteps(topicsABCD.slice(0, 3), modulesTwoByTwo)).toThrow(
      /topic count \(3\) does not match expected step count \(4\)/
    );
  });

  it('fails when course array is empty', () => {
    expect(() => extractSinglePathTopics({ course: [] })).toThrow(
      /course is missing or empty/
    );
  });

  it('fails when course length is not 1', () => {
    expect(() =>
      extractSinglePathTopics({
        course: [{ topics: topicsABCD }, { topics: [] }]
      })
    ).toThrow(/course.length must be 1/);
  });

  it('does not use course\[i\] as module\[i\] — only course\[0\].topics', () => {
    const topics = extractSinglePathTopics({
      course: [{ topics: topicsABCD }]
    });
    expect(topics).toEqual(topicsABCD);
    expect(getExpectedStepCount(modulesTwoByTwo)).toBe(4);
    expect(assertTopicCountMatchesSteps(topics, modulesTwoByTwo)).toBe(4);
  });

  it('fails when a learning_module has no steps array', () => {
    expect(() =>
      getExpectedStepCount([{ module_title: 'Broken', steps: null }])
    ).toThrow(/must have steps as an array/);
  });

  it('slices in raw array order when that differs from module_order', () => {
    const rawOrderModules = [
      { module_order: 2, module_title: 'B', steps: [{ title: 'B1' }, { title: 'B2' }] },
      { module_order: 1, module_title: 'A', steps: [{ title: 'A1' }] }
    ];
    const topics = [
      { topic_name: 'B1' },
      { topic_name: 'B2' },
      { topic_name: 'A1' }
    ];

    const slices = sliceTopicsByModuleSteps(topics, rawOrderModules);

    expect(slices[0].topics.map((t) => t.topic_name)).toEqual(['B1', 'B2']);
    expect(slices[1].topics.map((t) => t.topic_name)).toEqual(['A1']);
  });
});
