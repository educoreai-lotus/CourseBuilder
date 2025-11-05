import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getCourseById } from '../services/apiService.js'
import CourseTreeView from '../components/CourseTreeView.jsx'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext'

export default function TrainerCourseValidation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [validated, setValidated] = useState(false)

  useEffect(() => {
    loadCourse()
  }, [id])

  const loadCourse = async () => {
    setLoading(true)
    try {
      const data = await getCourseById(id)
      setCourse(data)
      setValidated(data.status === 'validated')
    } catch (err) {
      showToast('Failed to load course', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = () => {
    setValidated(true)
    showToast('Course validated successfully! Ready for publishing.', 'success')
  }

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <LoadingSpinner message="Loading course..." />
      </div>
    )
  }

  if (!course) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl)' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2>Course not found</h2>
          <Button variant="primary" onClick={() => navigate('/trainer/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
      <div className="microservices-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/trainer/dashboard')}
            style={{ marginBottom: 'var(--spacing-md)' }}
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Dashboard
          </Button>
          <h1 className="section-title" style={{ textAlign: 'left', marginBottom: 'var(--spacing-md)' }}>
            Validate Course Structure
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Review and validate the course structure, content, and AI enrichment before publishing
          </p>
        </div>

        {/* Course Info */}
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-lg)' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '1.8rem',
                fontWeight: 600,
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--text-primary)'
              }}>
                {course.title || course.course_name}
              </h2>
              <p style={{
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-md)'
              }}>
                {course.description || course.course_description}
              </p>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                <span style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  background: 'rgba(0, 166, 118, 0.1)',
                  color: 'var(--primary-emerald)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  textTransform: 'capitalize'
                }}>
                  {course.level || 'beginner'}
                </span>
                <span style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  background: validated 
                    ? 'rgba(4, 120, 87, 0.1)' 
                    : 'rgba(245, 158, 11, 0.1)',
                  color: validated 
                    ? 'var(--accent-green)' 
                    : '#f59e0b',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}>
                  {validated ? '✓ Validated' : 'Pending Validation'}
                </span>
              </div>
            </div>
            <div>
              {!validated && (
                <Button
                  variant="primary"
                  onClick={handleValidate}
                >
                  <i className="fas fa-check-circle mr-2"></i>
                  Validate Course
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Course Structure */}
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-primary)'
          }}>
            Course Structure
          </h2>
          <CourseTreeView 
            modules={course.modules || []} 
            courseId={id}
          />
        </div>

        {/* Validation Checklist */}
        <div className="card">
          <h3 style={{
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-primary)'
          }}>
            Validation Checklist
          </h3>
          <ul style={{
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)'
          }}>
            {[
              { label: 'Course structure is complete', checked: (course.modules || []).length > 0 },
              { label: 'All modules have lessons', checked: (course.modules || []).every(m => (m.lessons || []).length > 0) },
              { label: 'Course description is provided', checked: !!(course.description || course.course_description) },
              { label: 'Level is assigned', checked: !!course.level },
              { label: 'AI enrichment is applied', checked: true } // Mock check
            ].map((item, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  padding: 'var(--spacing-sm)',
                  background: item.checked ? 'rgba(4, 120, 87, 0.1)' : 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <i
                  className={item.checked ? 'fas fa-check-circle' : 'fas fa-circle'}
                  style={{
                    color: item.checked ? 'var(--accent-green)' : 'var(--text-muted)',
                    fontSize: '1.2rem'
                  }}
                ></i>
                <span style={{
                  color: item.checked ? 'var(--text-primary)' : 'var(--text-muted)',
                  textDecoration: item.checked ? 'none' : 'line-through'
                }}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-md)',
          marginTop: 'var(--spacing-xl)',
          justifyContent: 'center'
        }}>
          <Button
            variant="primary"
            onClick={() => navigate(`/trainer/publish/${id}`)}
            disabled={!validated}
          >
            <i className="fas fa-paper-plane mr-2"></i>
            Proceed to Publishing
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/trainer/dashboard')}
          >
            Save & Return
          </Button>
        </div>
      </div>
      <Toast />
    </div>
  )
}

