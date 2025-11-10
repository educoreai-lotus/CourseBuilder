import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getCourseById, getFeedbackAnalytics } from '../services/apiService.js'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext'
import Container from '../components/Container.jsx'

export default function TrainerFeedbackAnalytics() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [course, setCourse] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [courseData, analyticsData] = await Promise.all([
        getCourseById(id),
        getFeedbackAnalytics(id).catch(() => null)
      ])
      setCourse(courseData)
      setFeedback(analyticsData)
    } catch (err) {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="personalized-dashboard">
        <Container>
          <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner message="Loading feedback analytics..." />
          </div>
        </Container>
      </div>
    )
  }

  const analytics = feedback || {
    average_rating: 0,
    total_feedback: 0,
    rating_trend: [],
    tags_breakdown: {},
    versions: []
  }

  return (
    <div className="personalized-dashboard">
      <Container>
        <section className="section-panel" style={{ maxWidth: '1200px', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
        <div>
          <Button variant="secondary" onClick={() => navigate('/trainer/dashboard')}>
            <i className="fas fa-arrow-left" style={{ marginRight: '8px' }} /> Back to dashboard
          </Button>
          <h1 style={{ marginTop: 'var(--spacing-lg)', fontSize: '2rem', fontWeight: 700 }}>Feedback analytics</h1>
          {course && (
            <p style={{ marginTop: 'var(--spacing-xs)', color: 'var(--text-muted)', fontSize: '1rem' }}>
              {course.title || course.course_name}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gap: 'var(--spacing-lg)', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <article className="course-card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Average rating</h3>
            <p style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>{analytics.average_rating?.toFixed(1) || 'N/A'}</p>
            <div style={{ color: '#FACC15', fontSize: '1.5rem' }}>{'★'.repeat(Math.round(analytics.average_rating || 0))}</div>
          </article>
          <article className="course-card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total feedback</h3>
            <p style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>{analytics.total_feedback || 0}</p>
          </article>
          <article className="course-card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Versions analysed</h3>
            <p style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>{analytics.versions?.length || 0}</p>
          </article>
        </div>

        <section className="course-card">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Feedback by category</h2>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: 'var(--spacing-md)' }}>
            {Object.entries(analytics.tags_breakdown || {}).map(([tag, rating]) => (
              <div key={tag} style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{tag}</strong>
                <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary-cyan)', marginTop: 'var(--spacing-xs)' }}>{rating.toFixed(1)}</p>
                <span style={{ color: '#FACC15' }}>{'★'.repeat(Math.round(rating))}</span>
              </div>
            ))}
            {Object.keys(analytics.tags_breakdown || {}).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No tagged feedback yet.</p>
            )}
          </div>
        </section>

        {analytics.rating_trend && analytics.rating_trend.length > 0 && (
          <section className="course-card">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Rating trend</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
              {analytics.rating_trend.map((trend, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(trend.date).toLocaleDateString()}</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary-cyan)' }}>{trend.avg_rating.toFixed(1)} ★</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {analytics.versions && analytics.versions.length > 0 && (
          <section className="course-card">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Ratings by version</h2>
            <div style={{ display: 'grid', gap: 'var(--spacing-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 'var(--spacing-md)' }}>
              {analytics.versions.map((v, idx) => (
                <div key={idx} style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-xs)' }}>Version {v.version_no}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>{v.avg_rating.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </section>
        )}
        </section>
      </Container>
    </div>
  )
}

