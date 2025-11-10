import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { getCourseById } from '../services/apiService.js'
import { useApp } from '../context/AppContext'
import Container from '../components/Container.jsx'

export default function AssessmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    loadCourse()
  }, [id])

  const loadCourse = async () => {
    setLoading(true)
    try {
      const data = await getCourseById(id)
      setCourse(data)
    } catch (err) {
      showToast('Failed to load course', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleStartAssessment = () => {
    setRedirecting(true)
    showToast('Assessment launching... good luck!', 'success')
    setTimeout(() => {
      showToast('Great job! Share your feedback with the course team.', 'success')
      navigate(`/course/${id}/feedback`)
    }, 2000)
  }

  if (loading) {
    return (
      <div className="personalized-dashboard">
        <Container>
          <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner message="Loading assessment..." />
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <Container>
        <section className="section-panel" style={{ maxWidth: '820px', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
          <Button variant="secondary" onClick={() => navigate(`/course/${id}/structure`)}>
            <i className="fas fa-arrow-left" style={{ marginRight: '8px' }} /> Back to course
          </Button>

          <article className="course-card" style={{ textAlign: 'center' }}>
            <div className="dashboard-icon" style={{ width: '80px', height: '80px', margin: '0 auto var(--spacing-md)' }}>
              <i className="fas fa-clipboard-check" style={{ fontSize: '2rem' }} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Course assessment</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: 'var(--spacing-xs)' }}>
              {course?.title || course?.course_name || 'Course'}
            </p>
          </article>

          <section className="course-card">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Assessment details</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)', color: 'var(--text-muted)' }}>
              <li><i className="fas fa-check-circle" style={{ color: '#047857', marginRight: '8px' }} /> Covers all course modules and lessons</li>
              <li><i className="fas fa-check-circle" style={{ color: '#047857', marginRight: '8px' }} /> Multiple choice and practical questions</li>
              <li><i className="fas fa-check-circle" style={{ color: '#047857', marginRight: '8px' }} /> Passing score: 70% or higher</li>
              <li><i className="fas fa-check-circle" style={{ color: '#047857', marginRight: '8px' }} /> Time limit: 60 minutes</li>
            </ul>
          </section>

          <section className="course-card" style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)', color: '#b45309', fontWeight: 600 }}>
              <i className="fas fa-exclamation-triangle" /> Important notes
            </div>
            <ul style={{ listStyle: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              <li>• Ensure all lessons are complete before starting the assessment.</li>
              <li>• You can only take the assessment once per course.</li>
              <li>• Results are shared with Learning Analytics and HR.</li>
              <li>• Upon passing, you&apos;ll receive a digital credential via Credly.</li>
            </ul>
          </section>

          <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
            <Button variant="primary" size="lg" onClick={handleStartAssessment} disabled={redirecting}>
              {redirecting ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} /> Redirecting...</> : <><i className="fas fa-play" style={{ marginRight: '8px' }} /> Start assessment</>}
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/course/${id}/structure`)} disabled={redirecting}>
              Cancel
            </Button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <i className="fas fa-info-circle" style={{ marginRight: '6px' }} /> Once finished, you&apos;ll move straight into the feedback page.
          </p>
        </section>
      </Container>
    </div>
  )
}

