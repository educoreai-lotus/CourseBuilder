/**
 * Personalized generation job helpers (frontend).
 * Readiness comes from CB overall jobs, not course.status alone.
 */

export const GENERATING_MESSAGE =
  "Your content is being created. You'll be able to start learning shortly."

export const FAILED_GENERATION_MESSAGE =
  "We couldn't finish creating this personalized course."

export const COURSE_REFRESH_LAG_MS = 2500

export const ACTIVE_JOB_STATUSES = new Set(['pending', 'processing'])

export function isActiveGenerationJob(job) {
  if (!job || typeof job !== 'object') return false
  return ACTIVE_JOB_STATUSES.has(String(job.status || '').toLowerCase())
}

export function isFailedGenerationJob(job) {
  if (!job || typeof job !== 'object') return false
  return String(job.status || '').toLowerCase() === 'failed'
}

export function isCompletedGenerationJob(job) {
  if (!job || typeof job !== 'object') return false
  return String(job.status || '').toLowerCase() === 'completed'
}

export function normalizeJobsResponse(data) {
  if (!data || typeof data !== 'object') {
    return []
  }
  if (Array.isArray(data.jobs)) {
    return data.jobs
  }
  if (Array.isArray(data)) {
    return data
  }
  return []
}

export function getActiveJobs(jobs) {
  if (!Array.isArray(jobs)) return []
  return jobs.filter(isActiveGenerationJob)
}

export function getFailedJobs(jobs) {
  if (!Array.isArray(jobs)) return []
  return jobs.filter(isFailedGenerationJob)
}

export function courseIdsWithActiveJobs(jobs) {
  const ids = new Set()
  for (const job of getActiveJobs(jobs)) {
    if (job.course_id != null && String(job.course_id).trim() !== '') {
      ids.add(String(job.course_id))
    }
  }
  return ids
}

export function courseIdsWithFailedJobs(jobs) {
  const ids = new Set()
  for (const job of getFailedJobs(jobs)) {
    if (job.course_id != null && String(job.course_id).trim() !== '') {
      ids.add(String(job.course_id))
    }
  }
  return ids
}

export function findActiveJobForCourse(jobs, courseId) {
  if (courseId == null || courseId === '') return null
  const id = String(courseId)
  return (
    getActiveJobs(jobs).find(
      (job) => job.course_id != null && String(job.course_id) === id
    ) || null
  )
}

export function findFailedJobForCourse(jobs, courseId) {
  if (courseId == null || courseId === '') return null
  const id = String(courseId)
  return (
    getFailedJobs(jobs).find(
      (job) => job.course_id != null && String(job.course_id) === id
    ) || null
  )
}

/**
 * Courses that should appear as normal ready cards:
 * personalized courses that are NOT tied to an active or failed job with course_id.
 * Failed jobs with course_id are also suppressed from "ready" grids.
 */
export function filterReadyPersonalizedCourses(courses, jobs) {
  if (!Array.isArray(courses)) return []
  const blocked = new Set([
    ...courseIdsWithActiveJobs(jobs),
    ...courseIdsWithFailedJobs(jobs)
  ])
  if (blocked.size === 0) return courses
  return courses.filter((course) => {
    const id = course?.id || course?.course_id
    if (id == null) return true
    return !blocked.has(String(id))
  })
}

export function jobsShareActiveIds(prevJobs, nextJobs) {
  const prev = getActiveJobs(prevJobs)
    .map((j) => String(j.job_id || j.id || ''))
    .sort()
    .join(',')
  const next = getActiveJobs(nextJobs)
    .map((j) => String(j.job_id || j.id || ''))
    .sort()
    .join(',')
  return prev === next
}

export function hadActiveJobsBecomeInactive(prevJobs, nextJobs) {
  const prevActive = getActiveJobs(prevJobs)
  if (prevActive.length === 0) return false
  const nextActiveIds = new Set(
    getActiveJobs(nextJobs).map((j) => String(j.job_id || j.id || ''))
  )
  return prevActive.some((j) => !nextActiveIds.has(String(j.job_id || j.id || '')))
}
