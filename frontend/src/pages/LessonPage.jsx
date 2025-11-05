import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import LessonViewer from '../components/LessonViewer.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext'

export default function LessonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [loading, setLoading] = useState(true)
  const [lesson, setLesson] = useState(null)

  useEffect(() => {
    // Simulate loading lesson content
    setTimeout(() => {
      setLesson({
        id,
        title: 'Introduction to Course Concepts',
        content: 'This is a mock lesson view. Content Studio JSON rendering will be integrated in a later stage.',
        content_type: 'text',
        duration: 15,
        micro_skills: ['Understanding basics', 'Applying concepts'],
        nano_skills: ['Learn fundamentals', 'Practice exercises']
      })
      setLoading(false)
    }, 1000)
  }, [id])

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <LoadingSpinner message="Loading lesson..." />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
      <div className="microservices-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Back Button */}
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
          style={{ marginBottom: 'var(--spacing-lg)' }}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Back
        </Button>

        {/* Lesson Content */}
        <LessonViewer
          lesson={lesson}
          onPrevious={() => navigate(-1)}
          onNext={() => navigate(-1)}
          onComplete={(lesson) => {
            showToast('Lesson completed!', 'success')
          }}
        />

        {/* Note */}
        <div style={{
          marginTop: 'var(--spacing-lg)',
          padding: 'var(--spacing-md)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          textAlign: 'center'
        }}>
          <i className="fas fa-info-circle mr-2"></i>
          This is a preview lesson. Full Content Studio JSON rendering will be integrated in a later stage.
        </div>
      </div>
      <Toast />
    </div>
  )
}
