import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { submitFeedback, getCourseById, getFeedback } from '../services/apiService.js'
import { useApp } from '../context/AppContext'
import Container from '../components/Container.jsx'

export default function FeedbackPage() {
  const { courseId, id } = useParams()
  const navigate = useNavigate()
  const actualCourseId = courseId || id
  const { showToast, userProfile, userRole } = useApp()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [course, setCourse] = useState(null)
  const [existingFeedback, setExistingFeedback] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    loadCourse()
    loadExistingFeedback()
  }, [actualCourseId])

  const loadCourse = async () => {
    try {
      const data = await getCourseById(actualCourseId)
      setCourse(data)
    } catch (err) {
      showToast('Failed to load course', 'error')
    }
  }

  const loadExistingFeedback = async () => {
    try {
      const data = await getFeedback(actualCourseId)
      if (data && data.average_rating) {
        setExistingFeedback(data)
      }
    } catch (err) {
      // ignore missing analytics
    }
  }

  const tagOptions = ['Clarity', 'Usefulness', 'Difficulty', 'Engagement', 'Pacing']

  const toggleTag = (tag) => {
    setTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const numericRating = Number(rating)
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      showToast('Rating must be between 1 and 5', 'error')
      return
    }

    setLoading(true)
    const learnerId = userRole === 'learner' ? userProfile?.id : null
    if (!learnerId) {
      showToast('Switch to the learner workspace to share feedback.', 'info')
      return
    }

    try {
      await submitFeedback(actualCourseId, {
        learner_id: learnerId,
        learner_name: userProfile?.name,
        rating: numericRating,
        tags: tags.length > 0 ? tags : ['General'],
        comment: comment.trim()
      })
      setSubmitted(true)
      showToast('Feedback submitted successfully! Thank you!', 'success')
      setTimeout(() => navigate(`/course/${actualCourseId}/structure`), 2000)
    } catch (err) {
      showToast('Failed to submit feedback', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="personalized-dashboard">
        <Container>
          <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-md)' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: '#047857' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Thank you!</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '420px' }}>
              Your feedback helps trainers keep the content fresh and relevant.
            </p>
            <Button variant="primary" onClick={() => navigate(`/course/${actualCourseId}/structure`)}>
              Back to course
            </Button>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <Container>
        <section className="section-panel" style={{ maxWidth: '820px', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div>
            <Link
              to={`/course/${actualCourseId}/structure`}
              style={{
                color: 'var(--primary-cyan)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)'
              }}
            >
              <i className="fas fa-arrow-left" /> Back to course
            </Link>
            <h1 style={{ marginTop: 'var(--spacing-md)', fontSize: '2rem', fontWeight: 700 }}>Submit feedback</h1>
            {course && <p style={{ color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>{course.title || course.course_name}</p>}
          </div>

          {existingFeedback && (
            <article className="course-card">
              <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Community rating</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>{existingFeedback.average_rating?.toFixed(1) || 'N/A'}</span>
                <span style={{ color: '#FACC15', fontSize: '1.3rem' }}>{'★'.repeat(Math.round(existingFeedback.average_rating || 0))}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>({existingFeedback.total_ratings || 0} ratings)</span>
              </div>
            </article>
          )}

          <form onSubmit={onSubmit} className="course-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                Rating <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>(1-5)</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  style={{ flex: 1, minWidth: '220px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>{rating}</span>
                  <span style={{ color: '#FACC15', fontSize: '1.2rem' }}>{'★'.repeat(Number(rating))}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                What stood out? <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>(optional)</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                {tagOptions.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: 'var(--spacing-xs) var(--spacing-md)',
                      background: tags.includes(tag) ? 'var(--gradient-primary)' : 'var(--bg-secondary)',
                      color: tags.includes(tag) ? '#fff' : 'var(--text-primary)',
                      border: tags.includes(tag) ? 'none' : '1px solid var(--bg-tertiary)',
                      borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                Additional comments <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>(optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="6"
                placeholder="Share your thoughts about this course..."
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <Button type="submit" variant="primary" disabled={loading} style={{ flex: 1 }}>
                {loading ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} /> Submitting...</> : <><i className="fas fa-paper-plane" style={{ marginRight: '8px' }} /> Submit feedback</>}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/course/${actualCourseId}/structure`)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
        </form>
        </section>
      </Container>
    </div>
  )
}
