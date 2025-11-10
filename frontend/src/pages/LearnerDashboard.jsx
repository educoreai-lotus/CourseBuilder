import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext'

const quickActions = [
  {
    title: 'Marketplace',
    description: 'Discover new learning paths curated by experts.',
    icon: 'fa-solid fa-store',
    to: '/learner/marketplace'
  },
  {
    title: 'Personalized',
    description: 'AI-personalised recommendations to stay ahead.',
    icon: 'fa-solid fa-wand-magic-sparkles',
    to: '/learner/personalized'
  },
  {
    title: 'Enrolled',
    description: 'Resume courses and track certificates in progress.',
    icon: 'fa-solid fa-book-open-reader',
    to: '/learner/enrolled'
  }
]

export default function LearnerDashboard() {
  const { showToast } = useApp()
  const [recommended, setRecommended] = useState([])
  const [continueLearning, setContinueLearning] = useState([])
  const [trendingTopics, setTrendingTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async (filters = {}) => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 24, ...filters })
      const courses = data.courses || []

      setRecommended(courses.slice(0, 6))
      setContinueLearning(
        courses.slice(6, 12).map((course, idx) => ({
          ...course,
          progress: 20 + ((idx * 17) % 60),
          lastTouched: `${2 + idx} days ago`
        }))
      )
      setTrendingTopics(
        courses.slice(12, 18).map((course, idx) => ({
          topic: course.category || `Topic ${idx + 1}`,
          learners: 320 + idx * 57,
          momentum: idx % 2 === 0 ? 'up' : 'steady'
        }))
      )
    } catch (err) {
      showToast('Failed to load your learner dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  const emptyState = useMemo(
    () => recommended.length === 0 && continueLearning.length === 0,
    [recommended, continueLearning]
  )

  if (loading) {
    return (
      <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading your learning hub..." />
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <p className="subtitle">Learner mode</p>
            <h1>Shape your learning journey with curated experiences</h1>
            <p className="subtitle">
              Jump back into ongoing courses, explore AI-guided recommendations, and stay on track with your growth milestones.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">12,487</span>
                <span className="stat-label">Active learners</span>
              </div>
              <div className="stat">
                <span className="stat-number">280+</span>
                <span className="stat-label">Curated courses</span>
              </div>
              <div className="stat">
                <span className="stat-number">92%</span>
                <span className="stat-label">Completion success</span>
              </div>
            </div>
            <div className="hero-actions">
              <Link to="/learner/marketplace" className="btn btn-primary">
                Browse marketplace
              </Link>
              <Link to="/learner/personalized" className="btn btn-secondary">
                View recommendations
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fa-solid fa-graduation-cap" />
                </div>
                <span className="card-title">Weekly focus</span>
              </div>
              <p className="progress-text">Designing Systems Thinking</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '72%' }} />
              </div>
              <p className="progress-text" style={{ marginTop: 'var(--spacing-sm)' }}>
                Complete 2 more lessons to unlock your milestone badge
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-container" style={{ marginTop: 'var(--spacing-xl)' }}>
        <div className="dashboard-grid">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.to} className="dashboard-card">
              <div className="dashboard-icon">
                <i className={action.icon} />
              </div>
              <h3>{action.title}</h3>
              <p>{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {emptyState ? (
        <section className="section-panel" style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
          <i className="fa-solid fa-compass" style={{ fontSize: '2rem', color: 'var(--primary-cyan)' }} />
          <h2 style={{ marginTop: 'var(--spacing-md)', fontSize: '1.75rem', fontWeight: 600 }}>Ready to start exploring?</h2>
          <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-muted)' }}>
            Build your learner profile by visiting the marketplace and saving courses to your library.
          </p>
          <div className="hero-actions" style={{ marginTop: 'var(--spacing-lg)' }}>
            <Link to="/learner/marketplace" className="btn btn-primary">
              Browse Marketplace
            </Link>
            <Link to="/learner/personalized" className="btn btn-secondary">
              Get Recommendations
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="section-panel" style={{ marginTop: 'var(--spacing-xl)' }}>
            <div className="section-heading">
              <div>
                <h2>Recommended for you</h2>
                <p>Curated from your interests and recent activity.</p>
              </div>
              <Link to="/learner/personalized" className="action-link">
                View personalised hub <i className="fa-solid fa-chevron-right text-xs" />
              </Link>
            </div>
            <div className="course-grid">
              {recommended.slice(0, 4).map((course) => (
                <Link
                  key={course.id || course.course_id}
                  to={`/courses/${course.id || course.course_id}`}
                  className="course-card"
                >
                  <div>
                    <span className="tag-chip" style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <i className="fa-solid fa-layer-group" />
                      {course.level || 'Beginner'}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{course.title || course.course_name}</h3>
                    <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-muted)' }}>
                      {course.description || course.course_description || 'Build practical skills with guided lessons and projects.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span className="status-chip">
                      <i className="fa-solid fa-clock" />
                      {course.duration ? `${course.duration} min` : '45 min / lesson'}
                    </span>
                    <span className="status-chip">
                      <i className="fa-solid fa-star" />
                      {(course.rating || course.average_rating || 4.6).toFixed(1)} rating
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <div className="stats-row" style={{ marginTop: 'var(--spacing-xl)' }}>
            <section className="section-panel">
              <div className="section-heading">
                <div>
                  <h2>Continue learning</h2>
                  <p>Pick up where you left off last session.</p>
                </div>
                <Link to="/learner/enrolled" className="action-link">
                  View all <i className="fa-solid fa-arrow-right" />
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {continueLearning.slice(0, 4).map((course) => (
                  <div key={course.id || course.course_id} className="course-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)' }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{course.title || course.course_name}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Last opened {course.lastTouched}
                        </p>
                      </div>
                      <Link to={`/courses/${course.id || course.course_id}`} className="btn btn-primary" style={{ padding: '8px 16px' }}>
                        Resume
                      </Link>
                    </div>
                    <div className="progress-track" style={{ marginTop: 'var(--spacing-md)' }}>
                      <span className="progress-fill" style={{ width: `${course.progress}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-sm)' }}>
                      <span>{course.progress}% completed</span>
                      <span>{course.modules?.[0]?.lessons?.length || 8} lessons</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="section-panel">
              <div className="section-heading">
                <div>
                  <h2>Trending topics</h2>
                  <p>Communities growing in the last 7 days.</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {trendingTopics.map((topic) => (
                  <div key={topic.topic} className="course-card" style={{ padding: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 600 }}>{topic.topic}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {topic.learners.toLocaleString()} learners this week
                        </p>
                      </div>
                      <span className="status-chip" style={{ background: topic.momentum === 'up' ? 'rgba(34,197,94,0.12)' : 'rgba(14,165,233,0.12)', color: topic.momentum === 'up' ? '#047857' : '#0f766e' }}>
                        <i className={`fa-solid ${topic.momentum === 'up' ? 'fa-arrow-trend-up' : 'fa-arrow-right'}`} />
                        {topic.momentum === 'up' ? 'Growing' : 'Steady'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

