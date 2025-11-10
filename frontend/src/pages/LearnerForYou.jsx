import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useCourseProgress } from '../hooks/useCourseProgress.js'
import Container from '../components/Container.jsx'

const defaultCourseState = {
  completedStages: [],
  completedLessons: 0
}

const stageMeta = {
  lessons: {
    label: 'Take lesson',
    description: 'Complete guided lessons tailored for you',
    icon: 'fa-solid fa-play',
    accent: 'rgba(15,118,110,0.12)',
    accentBorder: 'rgba(15,118,110,0.45)'
  },
  exercises: {
    label: 'Do exercise',
    description: 'Practice skills with adaptive assessments',
    icon: 'fa-solid fa-dumbbell',
    accent: 'rgba(79,70,229,0.12)',
    accentBorder: 'rgba(79,70,229,0.4)'
  },
  exam: {
    label: 'Exam',
    description: 'Unlock after finishing lessons and exercises',
    icon: 'fa-solid fa-clipboard-check',
    accent: 'rgba(14,165,233,0.12)',
    accentBorder: 'rgba(14,165,233,0.4)'
  },
  feedback: {
    label: 'Feedback',
    description: 'Share reflections to improve future recommendations',
    icon: 'fa-solid fa-comments',
    accent: 'rgba(236,72,153,0.12)',
    accentBorder: 'rgba(236,72,153,0.4)'
  }
}

function PersonalizedCourseCard({ course, state, onCompleteStage, notify }) {
  const courseId = course.id || course.course_id
  const modules = course.modules || []
  const totalLessons = modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0) || 6

  const { canAccessStage, isStageComplete, isLastLessonCompleted } = useCourseProgress({
    courseType: 'personalized',
    completedStages: state.completedStages,
    totalLessons,
    completedLessons: state.completedLessons
  })

  const handleStageComplete = (stage) => () => {
    onCompleteStage(courseId, stage, totalLessons)
    notify(`Marked ${stage} as complete.`, 'success')
  }

  const stages = ['lessons', 'exercises', 'exam', 'feedback']

  return (
    <article className="course-card" style={{ gap: 'var(--spacing-lg)' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
        <div>
          <span className="tag-chip" style={{ marginBottom: 'var(--spacing-sm)', background: 'rgba(99,102,241,0.12)', color: '#4338ca' }}>
            <i className="fa-solid fa-sparkles" /> Personalized
          </span>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 600 }}>{course.title || course.course_name}</h3>
          <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-muted)' }}>
            {course.description || course.course_description || 'AI-generated pathway based on your goals.'}
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="status-chip" style={{ background: 'rgba(16,185,129,0.12)', color: '#047857' }}>
            <i className="fa-solid fa-layer-group" />
            {modules.length || 3} modules
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-book" style={{ marginRight: '6px' }} />
            {totalLessons} lessons
          </span>
        </div>
      </header>

      <div className="stage-grid">
        {stages.map((stageKey) => {
          const metadata = stageMeta[stageKey]
          const complete = isStageComplete(stageKey)
          const accessible =
            stageKey === 'exam'
              ? canAccessStage(stageKey) && isLastLessonCompleted
              : canAccessStage(stageKey)
          const disabled = !accessible || complete

          return (
            <button
              key={stageKey}
              type="button"
              onClick={handleStageComplete(stageKey)}
              disabled={disabled}
              className={`stage-button ${complete ? 'complete' : ''}`}
              style={
                !complete && accessible
                  ? { background: metadata.accent, borderColor: metadata.accentBorder }
                  : undefined
              }
            >
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{metadata.label}</span>
                <i className={metadata.icon} style={{ color: 'var(--text-muted)' }} />
              </div>
              <small>{metadata.description}</small>
            </button>
          )
        })}
      </div>

      <footer style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span className="status-chip" style={{ background: 'rgba(16,185,129,0.12)', color: '#047857' }}>
          <i className="fa-solid fa-seedling" /> Adaptive difficulty enabled
        </span>
        <span className="status-chip" style={{ background: 'rgba(14,165,233,0.12)', color: '#0f766e' }}>
          <i className="fa-solid fa-robot" /> AI trainer synced
        </span>
      </footer>
    </article>
  )
}

export default function LearnerForYou() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [courseState, setCourseState] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 24 })
      const personalised = (data.courses || []).filter((_, idx) => idx % 2 === 0)
      setCourses(personalised)
    } catch (err) {
      showToast('Failed to load personalized recommendations', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getCourseState = (courseId) => courseState[courseId] || defaultCourseState

  const updateCourseState = (courseId, updater) => {
    setCourseState(prev => {
      const current = prev[courseId] || defaultCourseState
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      return {
        ...prev,
        [courseId]: next
      }
    })
  }

  const handleStageCompletion = (courseId, stage, totalLessons) => {
    updateCourseState(courseId, (current) => {
      const completedStages = new Set(current.completedStages)
      completedStages.add(stage)
      return {
        ...current,
        completedStages: Array.from(completedStages),
        completedLessons: stage === 'lessons' ? totalLessons : current.completedLessons
      }
    })
  }

  if (loading) {
    return (
      <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading AI recommendations..." />
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <p className="subtitle">Personalised journey</p>
            <h1>Courses curated just for you</h1>
            <p className="subtitle">
              These learning paths adapt to your progress. Complete lessons, unlock exercises, then take the exam before sharing feedback for deeper insights.
            </p>
            <div className="hero-actions">
              <Link to="/learner/enrolled" className="btn btn-primary">
                View my library
              </Link>
              <Link to="/learner/marketplace" className="btn btn-secondary">
                Add more interests
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fa-solid fa-lightbulb" />
                </div>
                <span className="card-title">Next milestone</span>
              </div>
              <p className="progress-text">Unlock advanced AI toolkit</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '58%' }} />
              </div>
              <p className="progress-text" style={{ marginTop: 'var(--spacing-sm)' }}>
                Complete 1 more exam to refresh recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      <Container>
        {courses.length === 0 ? (
          <section className="section-panel" style={{ textAlign: 'center' }}>
            <i className="fa-solid fa-sparkles" style={{ fontSize: '2rem', color: 'var(--primary-cyan)' }} />
            <h2 style={{ marginTop: 'var(--spacing-md)', fontSize: '1.75rem', fontWeight: 600 }}>No personalised courses yet</h2>
            <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-muted)' }}>
              Interact with marketplace courses and complete feedback to unlock tailored recommendations.
            </p>
          </section>
        ) : (
          <section className="section-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {courses.map((course) => (
              <PersonalizedCourseCard
                key={course.id || course.course_id}
                course={course}
                state={getCourseState(course.id || course.course_id)}
                onCompleteStage={handleStageCompletion}
                notify={showToast}
              />
            ))}
          </section>
        )}
      </Container>
    </div>
  )
}

