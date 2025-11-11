import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Target,
  CheckCircle2,
  Sparkles,
  Clock,
  Layers
} from 'lucide-react'
import { getCourseById } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import CourseStructure from '../components/course/CourseStructure.jsx'
import { useApp } from '../context/AppContext'
import Container from '../components/Container.jsx'

export default function CourseStructurePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast, userRole, userProfile } = useApp()
  const learnerId = userRole === 'learner' ? userProfile?.id : null

  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [completedLessons, setCompletedLessons] = useState([])
  const [learnerProgress, setLearnerProgress] = useState(null)

  const loadCourse = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = learnerId ? { learner_id: learnerId } : undefined
      const data = await getCourseById(id, params)
      setCourse(data)
      const progress = data.learner_progress || null
      setLearnerProgress(progress)
      if (progress?.completed_lessons) {
        setCompletedLessons(progress.completed_lessons.map(String))
      } else {
        setCompletedLessons([])
      }
    } catch (err) {
      const message = err.message || 'Failed to load course structure'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [id, learnerId, showToast])

  useEffect(() => {
    loadCourse()
  }, [id, loadCourse])

  useEffect(() => {
    if (!loading && learnerProgress && !learnerProgress.is_enrolled && userRole === 'learner') {
      navigate(`/course/${id}/overview`, { replace: true })
    }
  }, [id, learnerProgress, loading, navigate, userRole])

  const flattenedLessons = useMemo(() => {
    if (!course) return []
    const topics = Array.isArray(course.topics) ? course.topics : []
    if (topics.length > 0) {
      return topics.flatMap((topic) => (topic.modules || []).flatMap((module) => module.lessons || []))
    }
    if (Array.isArray(course.modules)) {
      return course.modules.flatMap((module) => module.lessons || [])
    }
    if (Array.isArray(course.lessons)) {
      return course.lessons
    }
    return []
  }, [course])

  const moduleCount = useMemo(() => {
    if (!course) return 0
    if (Array.isArray(course.topics) && course.topics.length > 0) {
      return course.topics.reduce((count, topic) => count + (topic.modules?.length || 0), 0)
    }
    if (Array.isArray(course.modules)) {
      return course.modules.length
    }
    return 0
  }, [course])

  const totalLessons = flattenedLessons.length
  const progressPercent =
    Math.round(
      learnerProgress?.progress ??
        (totalLessons > 0 ? (completedLessons.length / totalLessons) * 100 : 0)
    )

  const completedSet = useMemo(() => new Set(completedLessons), [completedLessons])
  const nextLesson = flattenedLessons.find((lesson) => !completedSet.has(String(lesson.id || lesson.lesson_id)))
  const firstLesson = flattenedLessons[0] || null

  const personalized = Boolean(course?.metadata?.personalized)
  const selectedBackLink = personalized ? '/learner/personalized' : '/learner/marketplace'

  const handleSelectLesson = (lessonId) => {
    if (!lessonId) return
    navigate(`/course/${id}/lesson/${lessonId}`)
  }

  if (userRole === 'learner' && !learnerProgress?.is_enrolled && !loading) {
    return null
  }

  if (loading) {
    return (
      <div className="page-surface">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Loading course structure..." />
          </div>
        </Container>
      </div>
    )
  }

  if (!course || error) {
    return (
      <div className="page-surface">
        <Container>
          <section className="surface-card soft flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
            <i className="fa-solid fa-triangle-exclamation text-4xl text-[#f97316]" aria-hidden="true" />
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              {error || 'Course not found'}
            </h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/course/${id}/overview`)}
            >
              Back to overview
            </button>
          </section>
        </Container>
      </div>
    )
  }

  return (
    <div className="page-surface">
      <Container>
        <div className="flex flex-col gap-10 py-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              to={selectedBackLink}
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft size={16} />
              Back to {personalized ? 'personalized courses' : 'marketplace'}
            </Link>
            <div className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Structure · Lessons · Exercises
            </div>
          </div>

          <section className="microservice-card refined" style={{ textAlign: 'left' }}>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      background: 'rgba(14,165,233,0.12)',
                      color: '#0f766e'
                    }}
                  >
                    Course structure
                  </span>
                  {learnerProgress?.status && (
                    <span
                      className="rounded-full bg-[rgba(16,185,129,0.12)] px-3 py-1 text-xs font-semibold text-[#047857]"
                    >
                      {learnerProgress.status.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {course.title || course.course_name}
                  </h1>
                  <p className="text-base leading-7" style={{ color: 'var(--text-secondary)' }}>
                    Navigate the course journey, monitor your milestones, and jump into the next lesson when you&apos;re
                    ready. Complete each module to unlock exercises, assessments, and tailored feedback.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-white/90 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-2 text-[var(--primary-cyan)]">
                      <Layers size={18} />
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Modules
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {moduleCount || '--'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-white/90 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-2 text-[var(--primary-cyan)]">
                      <BookOpen size={18} />
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Lessons
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {totalLessons}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-white/90 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-2 text-[var(--primary-cyan)]">
                      <Clock size={18} />
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Progress
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {progressPercent}% complete
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-sm space-y-4 rounded-3xl border border-[rgba(148,163,184,0.18)] bg-white/80 p-6 shadow-lg backdrop-blur">
                <div className="space-y-2 text-sm">
                  <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Current milestone
                  </div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {completedLessons.length}/{totalLessons} lessons complete
                  </div>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Stay on track by completing lessons in sequence. Exercises and assessments unlock once lessons are
                    finished.
                  </p>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                  <div
                    className="h-full rounded-full bg-[var(--gradient-primary)] transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  {nextLesson || firstLesson ? (
                    <button
                      type="button"
                      className="btn btn-primary flex items-center justify-center gap-2"
                      onClick={() => handleSelectLesson(nextLesson?.id || nextLesson?.lesson_id || firstLesson.id || firstLesson.lesson_id)}
                    >
                      <Target size={18} />
                      {nextLesson ? 'Start next lesson' : 'Review lessons'}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="btn btn-secondary flex items-center justify-center gap-2"
                    onClick={() => navigate(`/course/${id}/overview`)}
                  >
                    <ArrowRight size={18} />
                    Back to overview
                  </button>
                </div>

                <ul className="space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                    Lessons unlock exercises and assessments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                    Track your momentum with adaptive progress
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                    Personalized insights after each module
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="microservice-card" style={{ textAlign: 'left' }}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Course content
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Expand topics to view modules and lessons. Complete lessons in order to unlock the full experience.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(14,165,233,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#0f766e]">
                <Sparkles size={14} />
                Guided journey
              </span>
            </div>

            <CourseStructure
              course={course}
              onSelectLesson={handleSelectLesson}
              completedLessonIds={completedLessons}
              unlocked={Boolean(learnerProgress?.is_enrolled)}
            />
          </section>
        </div>
      </Container>
    </div>
  )
}

