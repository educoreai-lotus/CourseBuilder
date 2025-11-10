import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

  if (userRole === 'learner' && !learnerProgress?.is_enrolled && !loading) {
    return (
      <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 'var(--spacing-md)' }}>
        <i className="fa-solid fa-circle-info" style={{ fontSize: '2.5rem', color: 'var(--primary-cyan)' }} />
        <div>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 600 }}>Enrol to view the structure</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 'var(--spacing-sm)', maxWidth: '420px' }}>
            Secure your spot in this course to unlock the module and lesson outline.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate(`/course/${id}/overview`)}>
          Back to overview
        </button>
      </div>
    )
  }

  const handleSelectLesson = (lessonId) => {
    if (!lessonId) return
    navigate(`/course/${id}/lesson/${lessonId}`)
  }

  const totalLessons = course?.modules?.reduce((total, module) => {
    return total + (module.lessons?.length || 0)
  }, 0) || 0

  const progressPercent = Math.round(learnerProgress?.progress ?? ((completedLessons.length / (totalLessons || 1)) * 100))

  const completionBadge = (
    <div className="floating-card" style={{ padding: 'var(--spacing-md)', fontSize: '0.95rem', background: 'rgba(16,185,129,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <i className="fa-solid fa-chart-simple" style={{ color: '#047857' }} />
        <span>
          Progress {progressPercent}% · {completedLessons.length}/{totalLessons} lessons complete
        </span>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="personalized-dashboard">
        <Container>
          <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner />
          </div>
        </Container>
      </div>
    )
  }

  if (!course || error) {
    return (
      <div className="personalized-dashboard">
        <Container>
          <section className="section-panel" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 'var(--spacing-md)' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '2.5rem', color: '#f97316' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 600 }}>{error || 'Course not found'}</h2>
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/course/${id}/overview`)}>
              Back to overview
            </button>
          </section>
        </Container>
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <nav className="breadcrumb" aria-label="Structure breadcrumb">
        <span>Overview</span>
        <span>Structure</span>
      </nav>

      <header className="hero" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="hero-container">
          <div className="hero-content">
            <p className="subtitle">Course structure</p>
            <h1>{course.title || course.course_name}</h1>
            <p className="subtitle">
              Explore the adaptive journey, track your milestones, and jump into the next lesson when ready.
            </p>
            {completionBadge}
            {learnerProgress?.status && (
              <p style={{ marginTop: 'var(--spacing-md)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Status:&nbsp;
                <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {learnerProgress.status.replace('_', ' ')}
                </span>
              </p>
            )}
          </div>
        </div>
      </header>

      <Container>
        <CourseStructure
          course={course}
          onSelectLesson={handleSelectLesson}
          completedLessonIds={completedLessons}
          unlocked
        />
      </Container>
    </div>
  )
}
