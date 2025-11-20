import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLearnerProgress } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useCourseProgress } from '../hooks/useCourseProgress.js'
import Container from '../components/Container.jsx'

const FALLBACK_LESSON_COUNT = 8

function LibraryCourseCard({ course }) {
  const totalLessons = course.lessons_total || FALLBACK_LESSON_COUNT
  const completedLessons = Math.round((course.progress / 100) * totalLessons)
  const completedStages = [
    'enroll',
    ...(completedLessons >= 1 ? ['lessons'] : []),
    ...(course.progress >= 70 ? ['exercises'] : []),
    ...(course.progress >= 95 ? ['exam'] : []),
    ...(course.status === 'completed' ? ['feedback'] : [])
  ]

  const { isStageComplete, canAccessStage, isLastLessonCompleted } = useCourseProgress({
    courseType: 'marketplace',
    isEnrolled: true,
    completedStages,
    totalLessons,
    completedLessons
  })

  const stageButtons = [
    {
      key: 'lessons-link',
      component: (
        <Link to={`/courses/${course.id || course.course_id}`} className="stage-button" style={{ borderColor: 'rgba(79,70,229,0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>Go to lessons</span>
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: 'var(--text-muted)' }} />
          </div>
          <small>Resume content where you left off</small>
        </Link>
      )
    },
    {
      key: 'exercises',
      stage: 'exercises',
      label: 'Practice exercises',
      icon: 'fa-solid fa-dumbbell',
      description: 'Strengthen retention with adaptive drills',
      accent: 'rgba(79,70,229,0.12)',
      border: 'rgba(79,70,229,0.4)'
    },
    {
      key: 'exam',
      stage: 'exam',
      label: 'Start exam',
      icon: 'fa-solid fa-clipboard-check',
      description: 'Complete all lessons first to unlock the exam',
      accent: 'rgba(14,165,233,0.12)',
      border: 'rgba(14,165,233,0.4)',
      extraCondition: () => isLastLessonCompleted
    },
    {
      key: 'feedback',
      stage: 'feedback',
      label: 'Share feedback',
      icon: 'fa-solid fa-comments',
      description: 'Provide insights to personalise future paths',
      accent: 'rgba(236,72,153,0.12)',
      border: 'rgba(236,72,153,0.4)'
    }
  ]

  return (
    <article className="course-card-enhanced">
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary-cyan)]">Enrolled</p>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-2">{course.title}</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Level: {course.level || 'beginner'} · Status: {(course.status || 'in_progress').replace('_', ' ')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="status-chip status-chip-info">
              <i className="fa-solid fa-chart-line" /> Progress
            </span>
            <span className="text-3xl font-bold text-[var(--primary-cyan)]">{Math.round(course.progress)}%</span>
            <span className="text-xs text-[var(--text-muted)]">
              {completedLessons} / {totalLessons} lessons
            </span>
          </div>
        </header>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${course.progress}%` }} />
        </div>

        <div className="stage-grid">
        {stageButtons.map((btn) => {
          if (btn.component) {
            return <div key={btn.key}>{btn.component}</div>
          }

          const complete = isStageComplete(btn.stage)
          const accessibleBase = canAccessStage(btn.stage)
          const accessible = btn.extraCondition ? accessibleBase && btn.extraCondition() : accessibleBase
          const disabled = !accessible || complete

          return (
            <button
              key={btn.key}
              type="button"
              disabled={disabled}
              className={`stage-button ${complete ? 'complete' : ''}`}
              style={
                !complete && accessible
                  ? { background: btn.accent, borderColor: btn.border }
                  : undefined
              }
            >
              <div className="flex justify-between w-full">
                <span>{btn.label}</span>
                <i className={`${btn.icon} text-[var(--text-muted)]`} />
              </div>
              <small>{btn.description}</small>
            </button>
          )
        })}
        </div>
      </div>
    </article>
  )
}

export default function LearnerLibrary() {
  const { showToast, userProfile, userRole } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (userRole !== 'learner') {
      setCourses([])
      setLoading(false)
      return
    }
    if (userProfile?.id) {
      loadProgress(userProfile.id)
    }
  }, [userProfile?.id, userRole])

  const loadProgress = async (learnerId = userProfile?.id) => {
    if (!learnerId) {
      showToast('Select a learner profile to view your library.', 'info')
      return
    }

    setLoading(true)
    try {
      const progressData = await getLearnerProgress(learnerId)
      const enhancedCourses = progressData.map(course => ({
        id: course.course_id,
        title: course.title,
        level: course.level,
        rating: course.rating,
        progress: course.progress,
        status: course.status,
        lessons_total: course.lessons_total || FALLBACK_LESSON_COUNT
      }))
      setCourses(enhancedCourses)
    } catch (err) {
      showToast('Failed to load your library', 'error')
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = courses.filter(course => {
    if (filter === 'all') return true
    if (filter === 'completed') return course.status === 'completed' || course.progress === 100
    if (filter === 'in_progress') return course.status === 'in_progress' || course.progress < 100
    return true
  })

  if (userRole !== 'learner') {
    return (
      <div className="personalized-dashboard">
        <Container>
          <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 'var(--spacing-md)' }}>
            <i className="fa-solid fa-user-graduate" style={{ fontSize: '2.5rem', color: 'var(--primary-cyan)' }} />
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Learner library unavailable</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: 'var(--spacing-sm)' }}>
                Switch to the learner workspace to review active enrolments and progress.
              </p>
            </div>
          </div>
        </Container>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="personalized-dashboard">
        <Container>
          <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner message="Loading your learning library..." />
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="page-surface">
      <Container>
        <div className="stack-lg pt-4">
          <section className="surface-card space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary-cyan)]">
                My Library
              </p>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                Continue where you left off
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
                Access enrolled courses, monitor progress, and complete pending assessments to unlock certificates.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/95 p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap gap-2">
              {['all', 'in_progress', 'completed'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    filter === option
                      ? 'bg-[var(--primary-cyan)] text-white shadow-sm'
                      : 'border border-[rgba(148,163,184,0.35)] bg-white/90 text-[var(--text-primary)] hover:border-[var(--primary-cyan)]'
                  }`}
                >
                  {option === 'all' ? 'All' : option === 'in_progress' ? 'In progress' : 'Completed'}
                </button>
              ))}
            </div>
            <span className="text-sm font-medium text-[var(--text-muted)]">
              {filtered.length} course{filtered.length === 1 ? '' : 's'} visible
            </span>
            </div>
          </section>

          {filtered.length === 0 ? (
            <section className="surface-card space-y-6">
              <div className="text-center space-y-4">
                <i className="fa-solid fa-books text-3xl text-[var(--primary-cyan)]" />
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">No courses found for this filter</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Browse the marketplace to add new courses to your learning library.
                </p>
              </div>
            </section>
          ) : (
            <section className="surface-card space-y-6">
              <div className="course-grid">
                {filtered.map((course) => (
                  <LibraryCourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          )}
        </div>
      </Container>
    </div>
  )
}

