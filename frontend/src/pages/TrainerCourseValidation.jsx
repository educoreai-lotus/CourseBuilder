import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getCourseById } from '../services/apiService.js'
import CourseTreeView from '../components/CourseTreeView.jsx'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext'
import Container from '../components/Container.jsx'

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
      <div className="personalized-dashboard">
        <Container>
          <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner message="Loading course..." />
          </div>
        </Container>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="personalized-dashboard">
        <Container>
          <section className="section-panel" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-md)' }}>
            <h2>Course not found</h2>
            <Button variant="primary" onClick={() => navigate('/trainer/dashboard')}>
              Back to dashboard
            </Button>
          </section>
        </Container>
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <Container>
        <section className="section-panel" style={{ maxWidth: '1200px', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
          <div>
            <Button variant="secondary" onClick={() => navigate('/trainer/dashboard')}>
              <i className="fas fa-arrow-left" style={{ marginRight: '8px' }} /> Back to dashboard
            </Button>
            <h1 style={{ marginTop: 'var(--spacing-lg)', fontSize: '2rem', fontWeight: 700 }}>Validate course structure</h1>
            <p style={{ marginTop: 'var(--spacing-xs)', color: 'var(--text-muted)', fontSize: '1rem' }}>
              Review the course hierarchy, confirm enrichment, and mark as ready before scheduling publishing.
            </p>
          </div>

          <article className="course-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 600 }}>{course.title || course.course_name}</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: 'var(--spacing-sm)' }}>{course.description || course.course_description}</p>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginTop: 'var(--spacing-md)' }}>
                  <span className="tag-chip" style={{ background: 'rgba(99,102,241,0.12)', color: '#4338ca' }}>{course.level || 'beginner'}</span>
                  <span className="status-chip" style={{ background: validated ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.15)', color: validated ? '#047857' : '#b45309' }}>
                    {validated ? 'Validated' : 'Pending validation'}
                  </span>
                </div>
              </div>
              {!validated && (
                <Button variant="primary" onClick={handleValidate}>
                  <i className="fas fa-check-circle" style={{ marginRight: '8px' }} /> Validate course
                </Button>
              )}
            </div>
          </article>

          <section className="course-card">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Course structure</h2>
            <CourseTreeView modules={course.modules || []} courseId={id} />
          </section>

          <section className="course-card">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Validation checklist</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
              {[{
                label: 'Course structure is complete',
                checked: (course.modules || []).length > 0
              }, {
                label: 'All modules have lessons',
                checked: (course.modules || []).every(m => (m.lessons || []).length > 0)
              }, {
                label: 'Course description is provided',
                checked: !!(course.description || course.course_description)
              }, {
                label: 'Level is assigned',
                checked: !!course.level
              }, {
                label: 'AI enrichment is applied',
                checked: true
              }].map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: item.checked ? 'rgba(16,185,129,0.12)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <i className={item.checked ? 'fas fa-check-circle' : 'fas fa-circle'} style={{ color: item.checked ? '#047857' : 'var(--text-muted)' }} />
                  <span style={{ color: item.checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => navigate(`/trainer/publish/${id}`)} disabled={!validated}>
              <i className="fas fa-paper-plane" style={{ marginRight: '8px' }} /> Proceed to publishing
            </Button>
            <Button variant="secondary" onClick={() => navigate('/trainer/dashboard')}>
              Save & return
            </Button>
          </div>
        </section>
      </Container>
    </div>
  )
}

