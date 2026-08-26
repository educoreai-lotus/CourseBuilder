import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PersonalizedGenerationState from '../components/PersonalizedGenerationState.jsx'
import { useApp } from '../context/AppContext.jsx'
import Container from '../components/Container.jsx'
import CourseCard from '../components/CourseCard.jsx'
import { filterPersonalizedCourses } from '../utils/courseTypeUtils.js'
import { usePersonalizedGenerationJobs } from '../hooks/usePersonalizedGenerationJobs.js'
import {
  COURSE_REFRESH_LAG_MS,
  filterReadyPersonalizedCourses,
  getActiveJobs,
  getFailedJobs
} from '../utils/personalizedGenerationJobs.js'

export default function LearnerForYou() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const lagTimerRef = useRef(null)

  const loadCourses = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) {
      setLoading(true)
    }
    try {
      const data = await getCourses({ limit: 100 })
      const allCourses = data.courses || []

      const personalized = filterPersonalizedCourses(allCourses).sort((a, b) => {
        const first = new Date(b.created_at || b.updated_at || Date.now())
        const second = new Date(a.created_at || a.updated_at || Date.now())
        return first - second
      })

      if (mountedRef.current) {
        setCourses(personalized)
      }
    } catch (err) {
      if (mountedRef.current && !quiet) {
        showToast('Failed to load personalized recommendations', 'error')
      }
    } finally {
      if (mountedRef.current && !quiet) {
        setLoading(false)
      }
    }
  }, [showToast])

  const handleActiveJobsBecameInactive = useCallback(() => {
    loadCourses({ quiet: true })
    if (lagTimerRef.current) {
      clearTimeout(lagTimerRef.current)
    }
    lagTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        loadCourses({ quiet: true })
      }
    }, COURSE_REFRESH_LAG_MS)
  }, [loadCourses])

  const { jobs, jobsError, softErrorShownRef } = usePersonalizedGenerationJobs({
    enabled: true,
    onActiveJobsBecameInactive: handleActiveJobsBecameInactive
  })

  useEffect(() => {
    mountedRef.current = true
    loadCourses({ quiet: false })
    return () => {
      mountedRef.current = false
      if (lagTimerRef.current) {
        clearTimeout(lagTimerRef.current)
      }
    }
  }, [loadCourses])

  useEffect(() => {
    if (!jobsError) return
    if (softErrorShownRef.current) return
    softErrorShownRef.current = true
    showToast('Could not refresh personalized generation status', 'error')
  }, [jobsError, showToast, softErrorShownRef])

  const readyCourses = filterReadyPersonalizedCourses(courses, jobs)
  const activeJobs = getActiveJobs(jobs)
  const failedJobs = getFailedJobs(jobs)
  const hasGenerationPanels = activeJobs.length > 0 || failedJobs.length > 0
  const showEmpty = readyCourses.length === 0 && !hasGenerationPanels

  if (loading) {
    return (
      <div className="page-surface">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Loading AI recommendations..." />
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="page-surface">
      <Container>
        <div className="flex flex-col gap-4 pt-4">
          <section className="surface-card space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary-cyan)]">
                Personalised journey
              </p>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">Courses curated just for you</h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
                Your personalized learning paths and AI-curated courses.
              </p>
            </div>
          </section>

          <section className="surface-card space-y-4">
            {showEmpty ? (
              <div className="text-center space-y-4">
                <i className="fa-solid fa-sparkles text-3xl text-[var(--primary-cyan)]" aria-hidden="true" />
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  No personalised courses yet
                </h2>
                <p className="text-[var(--text-secondary)]">
                  Generate your first learning path above to see AI-curated courses appear here.
                </p>
              </div>
            ) : (
              <div className="course-grid">
                {activeJobs.map((job) => (
                  <PersonalizedGenerationState
                    key={`gen-active-${job.job_id || job.id}`}
                    mode="generating"
                    competencyName={job.competency_target_name}
                  />
                ))}
                {failedJobs.map((job) => (
                  <PersonalizedGenerationState
                    key={`gen-failed-${job.job_id || job.id}`}
                    mode="failed"
                    competencyName={job.competency_target_name}
                  />
                ))}
                {readyCourses.map((course) => {
                  const courseId = course.id || course.course_id
                  return (
                    <div key={courseId} className="course-card-enhanced">
                      <CourseCard
                        course={course}
                        to={`/courses/${courseId}?personalized=true`}
                      />
                      <div className="mt-4 flex justify-end">
                        <Link
                          to={`/courses/${courseId}?personalized=true`}
                          className="btn btn-primary btn-sm flex items-center gap-2"
                        >
                          <i className="fa-solid fa-play" />
                          Start Course
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </Container>
    </div>
  )
}
