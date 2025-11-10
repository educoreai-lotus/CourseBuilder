import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCourses, publishCourse } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext'
import Container from '../components/Container.jsx'

export default function TrainerDashboard() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 50 })
      setCourses(data.courses || [])
    } catch (err) {
      showToast('Failed to load courses', 'error')
    } finally {
      setLoading(false)
    }
  }

  const onPublish = async (courseId) => {
    if (!window.confirm('Publish this course to the marketplace?')) return
    setPublishing(true)
    try {
      await publishCourse(courseId)
      showToast('Course published successfully!', 'success')
      loadCourses()
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to publish course'
      showToast(errorMsg, 'error')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="personalized-dashboard">
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <p className="subtitle">Trainer workspace</p>
            <h1>Validate and manage your course portfolio</h1>
            <p className="subtitle">
              Review drafts, publish updates, and monitor learner engagement across the emerald learning network.
            </p>
            <div className="hero-actions">
              <Link to="/trainer/courses" className="btn btn-primary">
                Lifecycle workspace
              </Link>
              <button type="button" className="btn btn-secondary" onClick={loadCourses}>
                Refresh data
              </button>
            </div>
          </div>
        </div>
      </section>

      <Container>
        <section className="section-panel">
          <header className="section-heading">
            <div>
              <h2>Active courses</h2>
              <p>My course portfolio ({courses.length})</p>
            </div>
          </header>

          {loading ? (
            <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoadingSpinner message="Syncing courses..." />
            </div>
          ) : courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-layer-group" style={{ fontSize: '2.5rem', color: 'var(--primary-cyan)' }} />
              <h3 style={{ marginTop: 'var(--spacing-md)', fontSize: '1.5rem', fontWeight: 600 }}>No assigned courses yet</h3>
              <p style={{ marginTop: 'var(--spacing-xs)' }}>
                Your course workspace will appear here once content is provisioned for you.
              </p>
            </div>
          ) : (
            <div className="course-grid">
              {courses.map(course => (
                <article key={course.id || course.course_id} className="course-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                    <span className="tag-chip" style={{ background: 'rgba(99,102,241,0.12)', color: '#4338ca' }}>
                      {course.level || 'beginner'}
                    </span>
                    <span className="status-chip" style={{ background: (course.status || 'draft') === 'live' ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.15)', color: (course.status || 'draft') === 'live' ? '#047857' : '#b45309' }}>
                      <i className="fa-solid fa-circle" style={{ fontSize: '0.5rem' }} /> {course.status || 'draft'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{course.title || course.course_name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {course.description || course.course_description || 'No description yet.'}
                  </p>
                  <div className="stage-grid">
                    {course.status !== 'live' && (
                      <button
                        type="button"
                        onClick={() => onPublish(course.id || course.course_id)}
                        disabled={publishing}
                        className="stage-button"
                        style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.4)' }}
                      >
                        <span>Publish</span>
                        <small>Send to marketplace</small>
                      </button>
                    )}
                    <Link to={`/trainer/course/${course.id || course.course_id}`} className="stage-button" style={{ background: 'rgba(79,70,229,0.12)', borderColor: 'rgba(79,70,229,0.4)' }}>
                      <span>Review &amp; validate</span>
                      <small>Check structure and readiness</small>
                    </Link>
                    {course.status === 'live' && (
                      <Link to={`/trainer/feedback/${course.id || course.course_id}`} className="stage-button" style={{ background: 'rgba(236,72,153,0.12)', borderColor: 'rgba(236,72,153,0.4)' }}>
                        <span>Analytics</span>
                        <small>Monitor feedback trends</small>
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </Container>
    </div>
  )
}
