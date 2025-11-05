import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourseById, registerLearner } from '../services/apiService.js'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import CourseTreeView from '../components/CourseTreeView.jsx'
import { useApp } from '../context/AppContext'

export default function CourseDetailsPage() {
  const { id } = useParams()
  const { showToast, userRole } = useApp()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)
  const [error, setError] = useState(null)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    loadCourse()
  }, [id])

  const loadCourse = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCourseById(id)
      setCourse(data)
    } catch (err) {
      setError(err.message || 'Failed to load course')
      showToast('Failed to load course', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setRegistering(true)
    try {
      await registerLearner(id, { 
        learner_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' // Mock learner ID
      })
      setEnrolled(true)
      showToast('Successfully enrolled in course!', 'success')
    } catch (err) {
      setError('Registration failed')
      showToast('Registration failed', 'error')
    } finally {
      setRegistering(false)
    }
  }

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <LoadingSpinner />
      </div>
    )
  }

  if (!course || error) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl)' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <i className="fas fa-exclamation-circle" style={{ fontSize: '3rem', color: '#EF4444', marginBottom: 'var(--spacing-md)' }}></i>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
            {error || 'Course not found'}
          </h2>
          <Link to="/courses">
            <Button variant="primary">Browse Courses</Button>
          </Link>
        </div>
      </div>
    )
  }

  const courseTitle = course.title || course.course_name
  const courseDescription = course.description || course.course_description
  const modules = course.modules || []

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
      <div className="microservices-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Course Header */}
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-lg)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <span style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  background: 'rgba(0, 166, 118, 0.1)',
                  color: 'var(--primary-emerald)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textTransform: 'capitalize'
                }}>
                  {course.level || 'beginner'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: '#FACC15' }}>
                  <i className="fas fa-star"></i>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {course.rating || course.average_rating || '4.5'}
                  </span>
                </div>
                {course.duration && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <i className="fas fa-clock mr-2"></i>
                    {course.duration} minutes
                  </span>
                )}
              </div>
              
              <h1 className="section-title" style={{ 
                textAlign: 'left', 
                fontSize: '2.5rem',
                marginBottom: 'var(--spacing-md)'
              }}>
                {courseTitle}
              </h1>
              
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '1.1rem',
                lineHeight: 1.6,
                marginBottom: 'var(--spacing-lg)'
              }}>
                {courseDescription}
              </p>

              {course.trainer_name && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-lg)',
                  color: 'var(--text-secondary)'
                }}>
                  <i className="fas fa-chalkboard-teacher"></i>
                  <span>Instructor: <strong>{course.trainer_name}</strong></span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                {!enrolled && userRole === 'learner' && (
                  <Button
                    variant="primary"
                    onClick={handleRegister}
                    disabled={registering}
                  >
                    {registering ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Registering...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus mr-2"></i>
                        Enroll in Course
                      </>
                    )}
                  </Button>
                )}
                {enrolled && (
                  <Button variant="secondary" disabled>
                    <i className="fas fa-check-circle mr-2"></i>
                    Enrolled
                  </Button>
                )}
                <Link to={`/course/${id}/feedback`}>
                  <Button variant="outline">
                    <i className="fas fa-comment mr-2"></i>
                    Leave Feedback
                  </Button>
                </Link>
                {userRole === 'learner' && enrolled && (
                  <Link to={`/course/${id}/assessment`}>
                    <Button variant="secondary">
                      <i className="fas fa-clipboard-check mr-2"></i>
                      Take Assessment
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Course Stats */}
            <div style={{
              background: 'var(--bg-secondary)',
              padding: 'var(--spacing-lg)',
              borderRadius: 'var(--radius-md)',
              minWidth: '200px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                  {course.total_enrollments || 0}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enrollments</div>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                  {course.completion_rate || 0}%
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Completion Rate</div>
              </div>
              {course.status && (
                <div style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  background: course.status === 'live' 
                    ? 'rgba(4, 120, 87, 0.1)' 
                    : 'rgba(100, 116, 139, 0.1)',
                  color: course.status === 'live' 
                    ? 'var(--accent-green)' 
                    : 'var(--text-muted)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  textTransform: 'capitalize',
                  fontWeight: 500
                }}>
                  {course.status}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Course Modules */}
        <div>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 600,
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-primary)'
          }}>
            Course Structure
          </h2>
          <CourseTreeView 
            modules={modules} 
            courseId={id}
          />
        </div>
      </div>
      <Toast />
    </div>
  )
}

