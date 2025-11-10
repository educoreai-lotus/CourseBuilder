import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext.jsx'
import Container from '../components/Container.jsx'

export default function TrainerCourses() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 50 })
      setCourses(data.courses || [])
    } catch (err) {
      showToast('Failed to load trainer courses', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter(course => {
    if (statusFilter === 'all') return true
    return (course.status || 'draft') === statusFilter
  })

  return (
    <div className="personalized-dashboard">
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <p className="subtitle">Trainer lifecycle</p>
            <h1>Manage course lifecycle</h1>
            <p className="subtitle">
              Draft, refine, and publish courses across versions. Track feedback and keep content evergreen with quick actions.
            </p>
            <div className="hero-actions">
              <Link to="/trainer/dashboard" className="btn btn-secondary">
                Back to dashboard
              </Link>
              <button type="button" className="btn btn-primary" onClick={loadCourses}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      <Container>
        <section className="section-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              {['all', 'draft', 'live', 'archived'].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className="stage-button"
                  style={
                    statusFilter === status
                      ? { background: 'rgba(6,95,70,0.12)', borderColor: 'rgba(6,95,70,0.45)' }
                      : { background: 'var(--bg-card)' }
                  }
                >
                  <span style={{ textTransform: 'capitalize' }}>{status === 'all' ? 'All' : status}</span>
                  <small>{status === 'all' ? `${courses.length} total` : ''}</small>
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {filteredCourses.length} course{filteredCourses.length === 1 ? '' : 's'} shown
            </span>
          </div>
        </section>
      </Container>

      {loading ? (
        <Container>
          <div className="section-panel" style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner message="Loading trainer workspace..." />
          </div>
        </Container>
      ) : filteredCourses.length === 0 ? (
        <Container>
          <section className="section-panel" style={{ textAlign: 'center' }}>
            <i className="fa-solid fa-chalkboard" style={{ fontSize: '2.5rem', color: 'var(--primary-cyan)' }} />
            <h2 style={{ marginTop: 'var(--spacing-md)', fontSize: '1.75rem', fontWeight: 600 }}>No courses for this status</h2>
            <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-muted)' }}>
              Adjust the filter or reach out to the curriculum team to provision additional content.
            </p>
          </section>
        </Container>
      ) : (
        <Container>
          <section className="section-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {filteredCourses.map(course => (
              <article key={course.id || course.course_id} className="course-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                  <div>
                    <span className="tag-chip" style={{ background: 'rgba(148,163,184,0.15)', color: 'var(--text-muted)' }}>
                      {course.category || 'General'}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 'var(--spacing-sm)' }}>
                      {course.title || course.course_name}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {course.description || course.course_description || 'Keep this course updated with the latest insights and best practices.'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span className="status-chip" style={{ background: (course.status || 'draft') === 'live' ? 'rgba(16,185,129,0.12)' : (course.status || 'draft') === 'archived' ? 'rgba(148,163,184,0.2)' : 'rgba(234,179,8,0.15)', color: (course.status || 'draft') === 'live' ? '#047857' : (course.status || 'draft') === 'archived' ? 'var(--text-secondary)' : '#b45309' }}>
                      <i className="fa-solid fa-circle" style={{ fontSize: '0.5rem' }} /> {course.status || 'draft'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Last updated {course.updated_at ? new Date(course.updated_at).toLocaleDateString() : 'recently'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {course.total_enrollments || 0} active learners
                    </span>
                  </div>
                </div>
                <div className="stage-grid">
                  <Link to={`/trainer/course/${course.id || course.course_id}`} className="stage-button" style={{ background: 'rgba(79,70,229,0.12)', borderColor: 'rgba(79,70,229,0.4)' }}>
                    <span>Edit content &amp; versions</span>
                    <small>Update modules, lessons, and metadata</small>
                  </Link>
                  <Link to={`/trainer/publish/${course.id || course.course_id}`} className="stage-button" style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.4)' }}>
                    <span>Schedule publishing</span>
                    <small>Coordinate releases with stakeholders</small>
                  </Link>
                  <Link to={`/trainer/feedback/${course.id || course.course_id}`} className="stage-button" style={{ background: 'rgba(236,72,153,0.12)', borderColor: 'rgba(236,72,153,0.4)' }}>
                    <span>Feedback analytics</span>
                    <small>Monitor sentiment and tags</small>
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </Container>
      )}
    </div>
  )
}


