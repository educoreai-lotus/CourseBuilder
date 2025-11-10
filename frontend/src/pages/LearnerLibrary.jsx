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
    <article className="course-card" style={{ gap: 'var(--spacing-lg)' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
        <div>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--primary-cyan)', fontWeight: 600 }}>Enrolled</p>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: 'var(--spacing-sm)' }}>{course.title}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Level: {course.level || 'beginner'} · Status: {(course.status || 'in_progress').replace('_', ' ')}
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="status-chip" style={{ background: 'rgba(14,165,233,0.12)', color: '#0f766e' }}>
            <i className="fa-solid fa-chart-line" /> Progress
          </span>
          <span style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>{Math.round(course.progress)}%</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>{btn.label}</span>
                <i className={btn.icon} style={{ color: 'var(--text-muted)' }} />
              </div>
              <small>{btn.description}</small>
            </button>
          )
        })}
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
        status: course.status
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
    <div className="personalized-dashboard">
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <p className="subtitle">Welcome back{userProfile?.name ? `, ${userProfile.name}` : ''}</p>
            <h1>Continue where you left off</h1>
            <p className="subtitle">
              Access enrolled courses, monitor progress, and complete pending assessments to unlock certificates.
            </p>
            <div className="hero-actions">
              <Link to="/learner/marketplace" className="btn btn-primary">
                Enrol in new course
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => loadProgress(userProfile?.id)}
                disabled={!userProfile?.id}
              >
                Refresh progress
              </button>
            </div>
          </div>
        </div>
      </section>

      <Container>
        <section className="section-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            {['all', 'in_progress', 'completed'].map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className="stage-button"
                style={
                  filter === option
                    ? { background: 'rgba(6,95,70,0.12)', borderColor: 'rgba(6,95,70,0.45)' }
                    : { background: 'var(--bg-card)' }
                }
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-circle" style={{ fontSize: '0.6rem' }} />
                  {option === 'all' ? 'All' : option === 'in_progress' ? 'In progress' : 'Completed'}
                </span>
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {filtered.length} course{filtered.length === 1 ? '' : 's'} visible
          </span>
        </section>
      </Container>

      <Container>
        {filtered.length === 0 ? (
          <section className="section-panel" style={{ textAlign: 'center' }}>
            <i className="fa-solid fa-books" style={{ fontSize: '2rem', color: 'var(--primary-cyan)' }} />
            <h2 style={{ marginTop: 'var(--spacing-md)', fontSize: '1.75rem', fontWeight: 600 }}>No courses found for this filter</h2>
            <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-muted)' }}>
              Browse the marketplace to add new courses to your learning library.
            </p>
          </section>
        ) : (
          <section className="section-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {filtered.map(course => (
              <LibraryCourseCard key={course.id} course={course} />
            ))}
          </section>
        )}
      </Container>
    </div>
  )
}

