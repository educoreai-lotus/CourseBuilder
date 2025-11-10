import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getCourseById, publishCourse, scheduleCourse } from '../services/apiService.js'
import PublishControls from '../components/PublishControls.jsx'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext'
import Container from '../components/Container.jsx'

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

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await publishCourse(id)
      showToast('Course published successfully!', 'success')
      navigate('/trainer/dashboard')
    } catch (err) {
      showToast('Failed to publish course', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const handleSchedule = async ({ scheduled_at }) => {
    setPublishing(true)
    try {
      await scheduleCourse(id, { publish_at: scheduled_at })
      showToast(`Course scheduled for ${new Date(scheduled_at).toLocaleString()}`, 'success')
      navigate('/trainer/dashboard')
    } catch (err) {
      showToast('Failed to schedule course', 'error')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="personalized-dashboard">
        <Container>
          <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner message="Loading course..." />
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <Container>
        <section className="section-panel" style={{ maxWidth: '820px', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
        <div>
          <Button variant="secondary" onClick={() => navigate(`/trainer/course/${id}`)}>
            <i className="fas fa-arrow-left" style={{ marginRight: '8px' }} /> Back to validation
          </Button>
          <h1 style={{ marginTop: 'var(--spacing-lg)', fontSize: '2rem', fontWeight: 700 }}>Publish course</h1>
          {course && (
            <p style={{ marginTop: 'var(--spacing-xs)', color: 'var(--text-muted)', fontSize: '1rem' }}>
              {course.title || course.course_name}
            </p>
          )}
        </div>

        {course && (
          <div className="course-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Course preview</h3>
            <div style={{ display: 'grid', gap: 'var(--spacing-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 'var(--spacing-md)' }}>
              <div>
                <span className="status-chip">Modules</span>
                <p style={{ fontSize: '1.6rem', fontWeight: 700 }}>{course.modules?.length || 0}</p>
              </div>
              <div>
                <span className="status-chip">Lessons</span>
                <p style={{ fontSize: '1.6rem', fontWeight: 700 }}>
                  {course.modules?.reduce((acc, module) => acc + (module.lessons?.length || 0), 0) || 0}
                </p>
              </div>
              <div>
                <span className="status-chip">Level</span>
                <p style={{ fontSize: '1.6rem', fontWeight: 700, textTransform: 'capitalize' }}>{course.level || 'beginner'}</p>
              </div>
            </div>
          </div>
        )}

        <PublishControls
          courseId={id}
          onPublish={() => handlePublish({ immediate: true })}
          onSchedule={handleSchedule}
          loading={publishing}
        />

        <div style={{ padding: 'var(--spacing-md)', background: 'rgba(6,95,70,0.08)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <i className="fas fa-info-circle" style={{ marginRight: '8px', color: 'var(--primary-cyan)' }} />
          Once published, the course will be visible in the internal marketplace and learners can register.
        </div>
        </section>
      </Container>
    </div>
  )
}

