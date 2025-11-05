import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { submitFeedback, getCourseById, getFeedback } from '../services/apiService.js'
import { useApp } from '../context/AppContext'

export default function FeedbackPage() {
  const { courseId, id } = useParams()
  const navigate = useNavigate()
  const actualCourseId = courseId || id // Support both /feedback/:courseId and /course/:id/feedback
  const { showToast } = useApp()
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
      // No existing feedback - that's okay
    }
  }

  const tagOptions = ['Clarity', 'Usefulness', 'Difficulty', 'Engagement', 'Pacing']
  
  const toggleTag = (tag) => {
    setTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    
    const numericRating = Number(rating)
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      showToast('Rating must be between 1 and 5', 'error')
      return
    }

    setLoading(true)
    try {
      await submitFeedback(actualCourseId, {
        learner_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', // Mock learner ID
        rating: numericRating,
        tags: tags.length > 0 ? tags : ['General'],
        comment: comment.trim()
      })
      setSubmitted(true)
      showToast('Feedback submitted successfully! Thank you!', 'success')
      setTimeout(() => {
        navigate(`/courses/${actualCourseId}`)
      }, 2000)
    } catch (err) {
      showToast('Failed to submit feedback', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl)' }}>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <i className="fas fa-check-circle" style={{ 
            fontSize: '4rem', 
            color: 'var(--accent-green)', 
            marginBottom: 'var(--spacing-lg)' 
          }}></i>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
            Thank You!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
            Your feedback has been submitted successfully.
          </p>
          <Button variant="primary" onClick={() => navigate(`/courses/${courseId}`)}>
            Back to Course
          </Button>
        </div>
        <Toast />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
      <div className="microservices-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {course && (
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <Link to={`/courses/${actualCourseId}`} style={{ 
              color: 'var(--primary-cyan)', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              marginBottom: 'var(--spacing-md)'
            }}>
              <i className="fas fa-arrow-left"></i>
              Back to Course
            </Link>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
              {course.title || course.course_name}
            </h2>
          </div>
        )}

        <div className="card">
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 600,
            marginBottom: 'var(--spacing-md)',
            color: 'var(--text-primary)'
          }}>
            Submit Feedback
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
            Help us improve by sharing your experience with this course.
          </p>

          {/* Existing Feedback Summary */}
          {existingFeedback && (
            <div style={{
              background: 'var(--bg-secondary)',
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-lg)'
            }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-xs)' }}>
                Community Average Rating
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                  {existingFeedback.average_rating?.toFixed(1) || 'N/A'}
                </div>
                <div style={{ color: '#FACC15', fontSize: '1.2rem' }}>
                  {'★'.repeat(Math.floor(existingFeedback.average_rating || 0))}
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  ({existingFeedback.total_ratings || 0} ratings)
                </span>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit}>
            {/* Rating */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--text-primary)',
                fontWeight: 500
              }}>
                Rating <span style={{ color: 'var(--text-muted)' }}>(1-5)</span>
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap'
              }}>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    height: '8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  minWidth: '120px'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: 'var(--primary-cyan)',
                    minWidth: '40px',
                    textAlign: 'center'
                  }}>
                    {rating}
                  </div>
                  <div style={{ color: '#FACC15', fontSize: '1.5rem' }}>
                    {'★'.repeat(Number(rating))}
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 'var(--spacing-xs)',
                fontSize: '0.85rem',
                color: 'var(--text-muted)'
              }}>
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--text-primary)',
                fontWeight: 500
              }}>
                What did you like? <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>(Optional)</span>
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--spacing-sm)'
              }}>
                {tagOptions.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: 'var(--spacing-xs) var(--spacing-md)',
                      background: tags.includes(tag) 
                        ? 'var(--gradient-primary)' 
                        : 'var(--bg-secondary)',
                      color: tags.includes(tag) ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${tags.includes(tag) ? 'transparent' : 'var(--bg-tertiary)'}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: 500
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--text-primary)',
                fontWeight: 500
              }}>
                Additional Comments <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>(Optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about this course..."
                rows="6"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane mr-2"></i>
                    Submit Feedback
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/courses/${actualCourseId}`)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
      <Toast />
    </div>
  )
}
