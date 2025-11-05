import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getCourseById, publishCourse } from '../services/apiService.js'
import PublishControls from '../components/PublishControls.jsx'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext'

export default function TrainerPublish() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

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

  const handlePublish = async ({ immediate }) => {
    setPublishing(true)
    try {
      await publishCourse(id)
      showToast('Course published successfully!', 'success')
      setTimeout(() => {
        navigate('/trainer/dashboard')
      }, 2000)
    } catch (err) {
      showToast('Failed to publish course', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const handleSchedule = async ({ scheduled_at }) => {
    setPublishing(true)
    try {
      // In real app, this would call schedule endpoint
      // await scheduleCourse(id, { scheduled_at })
      showToast(`Course scheduled for ${new Date(scheduled_at).toLocaleString()}`, 'success')
      setTimeout(() => {
        navigate('/trainer/dashboard')
      }, 2000)
    } catch (err) {
      showToast('Failed to schedule course', 'error')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <LoadingSpinner message="Loading course..." />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
      <div className="microservices-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <Button
            variant="secondary"
            onClick={() => navigate(`/trainer/course/${id}`)}
            style={{ marginBottom: 'var(--spacing-md)' }}
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Validation
          </Button>
          <h1 className="section-title" style={{ textAlign: 'left', marginBottom: 'var(--spacing-md)' }}>
            Publish Course
          </h1>
          {course && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              {course.title || course.course_name}
            </p>
          )}
        </div>

        {/* Course Preview */}
        {course && (
          <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: 600,
              marginBottom: 'var(--spacing-md)',
              color: 'var(--text-primary)'
            }}>
              Course Preview
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--spacing-xs)' }}>
                  Modules
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                  {course.modules?.length || 0}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--spacing-xs)' }}>
                  Lessons
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                  {course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--spacing-xs)' }}>
                  Level
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-cyan)', textTransform: 'capitalize' }}>
                  {course.level || 'beginner'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Publish Controls */}
        <PublishControls
          courseId={id}
          onPublish={handlePublish}
          onSchedule={handleSchedule}
          loading={publishing}
        />

        {/* Info */}
        <div style={{
          marginTop: 'var(--spacing-xl)',
          padding: 'var(--spacing-md)',
          background: 'rgba(0, 166, 118, 0.1)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          <i className="fas fa-info-circle mr-2" style={{ color: 'var(--primary-emerald)' }}></i>
          Once published, the course will be visible in the internal mini-marketplace and learners can register.
        </div>
      </div>
      <Toast />
    </div>
  )
}

