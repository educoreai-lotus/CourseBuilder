import {
  COURSE_REFRESH_LAG_MS,
  FAILED_GENERATION_MESSAGE,
  GENERATING_MESSAGE,
  filterReadyPersonalizedCourses,
  findActiveJobForCourse,
  findFailedJobForCourse,
  getActiveJobs,
  hadActiveJobsBecomeInactive,
  isActiveGenerationJob,
  isCompletedGenerationJob,
  isFailedGenerationJob,
  normalizeJobsResponse
} from '../personalizedGenerationJobs.js'

describe('personalizedGenerationJobs helpers', () => {
  test('copy constants match product copy', () => {
    expect(GENERATING_MESSAGE).toBe(
      "Your content is being created. You'll be able to start learning shortly."
    )
    expect(FAILED_GENERATION_MESSAGE).toBe(
      "We couldn't finish creating this personalized course."
    )
    expect(COURSE_REFRESH_LAG_MS).toBe(2500)
  })

  test('normalizeJobsResponse supports { jobs: [...] }', () => {
    expect(normalizeJobsResponse({ jobs: [{ job_id: '1' }] })).toEqual([{ job_id: '1' }])
    expect(normalizeJobsResponse({ jobs: [] })).toEqual([])
    expect(normalizeJobsResponse(null)).toEqual([])
    expect(normalizeJobsResponse({})).toEqual([])
  })

  test('active statuses are only pending and processing', () => {
    expect(isActiveGenerationJob({ status: 'pending' })).toBe(true)
    expect(isActiveGenerationJob({ status: 'processing' })).toBe(true)
    expect(isActiveGenerationJob({ status: 'completed' })).toBe(false)
    expect(isActiveGenerationJob({ status: 'failed' })).toBe(false)
    expect(isCompletedGenerationJob({ status: 'completed' })).toBe(true)
    expect(isFailedGenerationJob({ status: 'failed' })).toBe(true)
  })

  test('completed job is not active', () => {
    expect(getActiveJobs([{ job_id: '1', status: 'completed' }])).toEqual([])
  })

  test('matches course ids with string coercion', () => {
    const jobs = [{ job_id: 'j1', status: 'processing', course_id: 42 }]
    expect(findActiveJobForCourse(jobs, '42')?.job_id).toBe('j1')
    expect(findFailedJobForCourse([{ job_id: 'j2', status: 'failed', course_id: '9' }], 9)?.job_id).toBe(
      'j2'
    )
  })

  test('filterReadyPersonalizedCourses suppresses active and failed matched courses', () => {
    const courses = [
      { id: 'ready-1', title: 'Ready' },
      { id: 'active-1', title: 'Active' },
      { id: 'failed-1', title: 'Failed' }
    ]
    const jobs = [
      { job_id: 'a', status: 'pending', course_id: 'active-1' },
      { job_id: 'f', status: 'failed', course_id: 'failed-1' }
    ]
    expect(filterReadyPersonalizedCourses(courses, jobs).map((c) => c.id)).toEqual(['ready-1'])
  })

  test('legacy course with no job remains ready', () => {
    const courses = [{ id: 'legacy', title: 'Legacy' }]
    expect(filterReadyPersonalizedCourses(courses, [])).toEqual(courses)
    expect(filterReadyPersonalizedCourses(courses, [{ job_id: 'x', status: 'completed', course_id: 'legacy' }])).toEqual(
      courses
    )
  })

  test('detects active-to-inactive transition once', () => {
    const prev = [{ job_id: 'j1', status: 'processing' }]
    const next = [{ job_id: 'j1', status: 'completed' }]
    expect(hadActiveJobsBecomeInactive(prev, next)).toBe(true)
    expect(hadActiveJobsBecomeInactive(next, next)).toBe(false)
    expect(hadActiveJobsBecomeInactive([], next)).toBe(false)
  })
})
