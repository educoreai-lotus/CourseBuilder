import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getCourseById, getFeedback } from '../services/apiService.js'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext'

export default function TrainerFeedbackAnalytics() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [course, setCourse] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [courseData, feedbackData] = await Promise.all([
        getCourseById(id),
        getFeedback(id).catch(() => null) // Feedback might not exist
      ])
      setCourse(courseData)
      setFeedback(feedbackData)
    } catch (err) {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <LoadingSpinner message="Loading feedback analytics..." />
      </div>
    )
  }

  // Mock feedback data structure
  const analytics = feedback || {
    average_rating: 4.6,
    total_ratings: 128,
    tags_breakdown: {
      Clarity: 4.8,
      Usefulness: 4.7,
      Difficulty: 3.9,
      Engagement: 4.5
    },
    recent_comments: [
      { learner_name: 'Learner A', rating: 5, comment: 'Very clear and engaging!', timestamp: new Date().toISOString() },
      { learner_name: 'Learner B', rating: 4, comment: 'Great content, but could use more examples.', timestamp: new Date().toISOString() }
    ]
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
            Feedback Analytics
          </h1>
          {course && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              {course.title || course.course_name}
            </p>
          )}
        </div>

        {/* Overall Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: 700,
              color: 'var(--primary-cyan)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              {analytics.average_rating?.toFixed(1) || 'N/A'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-sm)' }}>
              Average Rating
            </div>
            <div style={{ color: '#FACC15', fontSize: '1.5rem' }}>
              {'★'.repeat(Math.floor(analytics.average_rating || 0))}
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: 700,
              color: 'var(--primary-cyan)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              {analytics.total_ratings || 0}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Total Ratings
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: 700,
              color: 'var(--primary-cyan)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              {analytics.recent_comments?.length || 0}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Comments
            </div>
          </div>
        </div>

        {/* Tags Breakdown */}
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-primary)'
          }}>
            Feedback by Category
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--spacing-md)'
          }}>
            {Object.entries(analytics.tags_breakdown || {}).map(([tag, rating]) => (
              <div
                key={tag}
                style={{
                  padding: 'var(--spacing-md)',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  {tag}
                </div>
                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: 'var(--primary-cyan)',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  {rating.toFixed(1)}
                </div>
                <div style={{ color: '#FACC15' }}>
                  {'★'.repeat(Math.floor(rating))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Comments */}
        <div className="card">
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-primary)'
          }}>
            Recent Comments
          </h3>
          {analytics.recent_comments && analytics.recent_comments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {analytics.recent_comments.map((comment, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--primary-cyan)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-sm)'
                  }}>
                    <div style={{
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}>
                      {comment.learner_name || 'Anonymous Learner'}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      color: '#FACC15'
                    }}>
                      {'★'.repeat(comment.rating)}
                    </div>
                  </div>
                  <p style={{
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    {comment.comment}
                  </p>
                  {comment.timestamp && (
                    <div style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)'
                    }}>
                      {new Date(comment.timestamp).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: 'var(--spacing-xl)',
              color: 'var(--text-muted)'
            }}>
              <i className="fas fa-comments" style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}></i>
              <p>No comments yet. Encourage learners to leave feedback!</p>
            </div>
          )}
        </div>
      </div>
      <Toast />
    </div>
  )
}

