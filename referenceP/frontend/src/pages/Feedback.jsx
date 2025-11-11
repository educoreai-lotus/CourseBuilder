import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useUserStore from '../store/useUserStore'
import { Star, CheckCircle, ArrowLeft, MessageSquare, Award } from 'lucide-react'

function Feedback() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { submitFeedback, isLoading } = useUserStore()
  const [rating, setRating] = useState(0)
  const [comments, setComments] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const result = await submitFeedback(id, rating, comments)
      if (result) {
        setSubmitted(true)
        setTimeout(() => {
          navigate('/')
        }, 2000)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="microservice-card max-w-md w-full text-center">
          <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-secondary)' }}>
            <CheckCircle size={32} />
          </div>
          <h1 className="hero-content h1 mb-4" style={{ color: 'var(--text-primary)' }}>Thank You!</h1>
          <p className="hero-content p mb-6" style={{ color: 'var(--text-secondary)' }}>
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--primary-cyan)' }}></div>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Redirecting to home page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="container py-8">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="microservice-card">
            <div className="text-center mb-8">
              <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
                <MessageSquare size={32} />
              </div>
              <h1 className="hero-content h1 mb-4" style={{ color: 'var(--text-primary)' }}>
                <Award className="inline mr-3" size={32} />
                Course Feedback
              </h1>
              <p className="hero-content p" style={{ color: 'var(--text-secondary)' }}>
                Please share your experience with this course to help us improve.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Rating Section */}
              <div>
                <label className="block text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                  How would you rate this course?
                </label>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        size={40}
                        className={`${
                          star <= rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill={star <= rating ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-center mt-2">
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {rating === 0 ? 'Select a rating' : 
                     rating === 1 ? 'Poor' :
                     rating === 2 ? 'Fair' :
                     rating === 3 ? 'Good' :
                     rating === 4 ? 'Very Good' : 'Excellent'}
                  </span>
                </div>
              </div>

              {/* Comments Section */}
              <div>
                <label htmlFor="comments" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Additional Comments (Optional)
                </label>
                <textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={6}
                  className="input resize-none"
                  placeholder="Tell us about your experience, what you liked, or what could be improved..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={rating === 0 || isLoading}
                  className="btn btn-primary px-8 py-3"
                  style={{ opacity: rating === 0 ? 0.5 : 1 }}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </div>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Feedback