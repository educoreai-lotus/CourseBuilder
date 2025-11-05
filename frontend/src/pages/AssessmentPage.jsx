import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { getCourseById } from '../services/apiService.js'
import { useApp } from '../context/AppContext'

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
    // In real app, this would redirect to Assessment microservice
    // For now, simulate the redirect
    showToast('Redirecting to Assessment microservice...', 'success')
    
    // Simulate redirect to Assessment service
    setTimeout(() => {
      // In production, this would be:
      // window.location.href = `${ASSESSMENT_SERVICE_URL}/start?course_id=${id}&learner_id=${learnerId}`
      showToast('Assessment service integration coming soon', 'success')
      navigate(`/courses/${id}`)
    }, 2000)
  }

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <LoadingSpinner message="Loading assessment..." />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
      <div className="microservices-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Button
          variant="secondary"
          onClick={() => navigate(`/courses/${id}`)}
          style={{ marginBottom: 'var(--spacing-lg)' }}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Back to Course
        </Button>

        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
            <div className="card-icon" style={{
              width: '80px',
              height: '80px',
              margin: '0 auto var(--spacing-lg)',
              background: 'var(--gradient-brand)'
            }}>
              <i className="fas fa-clipboard-check" style={{ fontSize: '2rem' }}></i>
            </div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 600,
              marginBottom: 'var(--spacing-md)',
              color: 'var(--text-primary)'
            }}>
              Course Assessment
            </h1>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1.1rem',
              marginBottom: 'var(--spacing-lg)'
            }}>
              {course?.title || course?.course_name || 'Course'}
            </p>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: 'var(--spacing-lg)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-xl)'
          }}>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: 600,
              marginBottom: 'var(--spacing-md)',
              color: 'var(--text-primary)'
            }}>
              Assessment Details
            </h3>
            <ul style={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-sm)',
              color: 'var(--text-secondary)'
            }}>
              <li>
                <i className="fas fa-check-circle mr-2" style={{ color: 'var(--accent-green)' }}></i>
                Covers all course modules and lessons
              </li>
              <li>
                <i className="fas fa-check-circle mr-2" style={{ color: 'var(--accent-green)' }}></i>
                Multiple choice and practical questions
              </li>
              <li>
                <i className="fas fa-check-circle mr-2" style={{ color: 'var(--accent-green)' }}></i>
                Passing score: 70% or higher
              </li>
              <li>
                <i className="fas fa-check-circle mr-2" style={{ color: 'var(--accent-green)' }}></i>
                Time limit: 60 minutes
              </li>
            </ul>
          </div>

          <div style={{
            padding: 'var(--spacing-lg)',
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-xl)',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              marginBottom: 'var(--spacing-sm)',
              color: 'var(--text-primary)',
              fontWeight: 600
            }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }}></i>
              Important Notes
            </div>
            <ul style={{
              listStyle: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              lineHeight: 1.8
            }}>
              <li>• Make sure you've completed all course lessons before taking the assessment</li>
              <li>• You can only take the assessment once per course</li>
              <li>• Results will be shared with Learning Analytics and HR</li>
              <li>• Upon passing, you'll receive a digital credential via Credly</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartAssessment}
              disabled={redirecting}
            >
              {redirecting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Redirecting...
                </>
              ) : (
                <>
                  <i className="fas fa-play mr-2"></i>
                  Start Assessment
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/courses/${id}`)}
              disabled={redirecting}
            >
              Cancel
            </Button>
          </div>

          <div style={{
            marginTop: 'var(--spacing-xl)',
            padding: 'var(--spacing-md)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}>
            <i className="fas fa-info-circle mr-2"></i>
            You will be redirected to the Assessment microservice to complete your exam.
          </div>
        </div>
      </div>
      <Toast />
    </div>
  )
}

