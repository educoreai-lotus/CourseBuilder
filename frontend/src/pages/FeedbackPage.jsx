import { useMemo, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Star,
  MessageSquare,
  CheckCircle2,
  Edit3,
  Trash2,
  Loader2,
  Sparkles
} from 'lucide-react'
import Container from '../components/Container.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import {
  submitFeedback,
  getCourseById,
  getFeedback,
  getMyFeedback,
  updateFeedback,
  deleteFeedback
} from '../services/apiService.js'
import { useApp } from '../context/AppContext'
import Button from '../components/Button.jsx'

const renderStars = (rating, onSelect, interactive = false) => {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= rating
        const star = (
          <Star
            key={value}
            size={36}
            className={filled ? 'text-yellow-400' : 'text-gray-300'}
            fill={filled ? 'currentColor' : 'none'}
          />
        )
        if (!interactive || !onSelect) {
          return star
        }
        return (
          <button
            type="button"
            key={value}
            className="transition-transform hover:scale-110 focus:outline-none"
            onClick={() => onSelect(value)}
          >
            {star}
          </button>
        )
      })}
    </div>
  )
}

export default function FeedbackPage() {
  const { courseId, id } = useParams()
  const actualCourseId = courseId || id
  const navigate = useNavigate()
  const { showToast, userProfile, userRole } = useApp()

  const [course, setCourse] = useState(null)
  const [communityStats, setCommunityStats] = useState(null)
  const [existingFeedback, setExistingFeedback] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [tags, setTags] = useState([])

  const [pageLoading, setPageLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)

  const tagOptions = useMemo(() => ['Clarity', 'Usefulness', 'Difficulty', 'Engagement', 'Pacing'], [])

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      setPageLoading(true)
      try {
        const [courseData, learnerFeedback, aggregated] = await Promise.all([
          getCourseById(actualCourseId).catch(() => null),
          getMyFeedback(actualCourseId).catch(() => null),
          getFeedback(actualCourseId).catch(() => null)
        ])

        if (!isMounted) return

        if (courseData) {
          setCourse(courseData)
        }

        if (aggregated && aggregated.average_rating) {
          setCommunityStats(aggregated)
        } else {
          setCommunityStats(null)
        }

        if (learnerFeedback) {
          setExistingFeedback(learnerFeedback)
          setRating(Number(learnerFeedback.rating) || 5)
          setComment(learnerFeedback.comment || '')
          setTags(Array.isArray(learnerFeedback.tags) ? learnerFeedback.tags : [])
          setIsEditing(false)
        } else {
          setExistingFeedback(null)
          setRating(5)
          setComment('')
          setTags([])
          setIsEditing(true)
        }
      } catch (error) {
        if (isMounted) {
          showToast('Unable to load feedback details. Please try again later.', 'error')
        }
      } finally {
        if (isMounted) {
          setPageLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      isMounted = false
    }
  }, [actualCourseId, showToast])

  const toggleTag = (tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const startEdit = () => {
    if (existingFeedback) {
      setRating(Number(existingFeedback.rating) || 5)
      setComment(existingFeedback.comment || '')
      setTags(Array.isArray(existingFeedback.tags) ? existingFeedback.tags : [])
    }
    setIsEditing(true)
  }

  const cancelEdit = () => {
    if (existingFeedback) {
      setRating(Number(existingFeedback.rating) || 5)
      setComment(existingFeedback.comment || '')
      setTags(Array.isArray(existingFeedback.tags) ? existingFeedback.tags : [])
      setIsEditing(false)
    } else {
      navigate(`/course/${actualCourseId}/overview`)
    }
  }

  const handleDelete = async () => {
    setFormLoading(true)
    try {
      await deleteFeedback(actualCourseId)
      showToast('Feedback removed. You can submit a new response anytime.', 'success')
      setExistingFeedback(null)
      setRating(5)
      setComment('')
      setTags([])
      setIsEditing(true)
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to delete feedback'
      showToast(message, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const numericRating = Number(rating)
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      showToast('Rating must be between 1 and 5.', 'error')
      return
    }

    const learnerId = userRole === 'learner' ? userProfile?.id : null
    if (!learnerId) {
      showToast('Switch to the learner workspace to share feedback.', 'info')
      return
    }

    setFormLoading(true)

    try {
      if (existingFeedback) {
        if (!isEditing) {
          showToast('Feedback already submitted. Edit or delete it to make changes.', 'info')
          return
        }

        await updateFeedback(actualCourseId, {
          rating: numericRating,
          tags: tags.length > 0 ? tags : ['General'],
          comment: comment.trim()
        })
        showToast('Feedback updated successfully!', 'success')
      } else {
        await submitFeedback(actualCourseId, {
          learner_id: learnerId,
          learner_name: userProfile?.name,
          rating: numericRating,
          tags: tags.length > 0 ? tags : ['General'],
          comment: comment.trim()
        })
        showToast('Feedback submitted successfully! Thank you!', 'success')
      }

      navigate(`/course/${actualCourseId}/overview`, { replace: true })
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to submit feedback'
      showToast(message, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="page-surface">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Preparing feedback workspace..." />
          </div>
        </Container>
      </div>
    )
  }

  const hasExistingFeedback = Boolean(existingFeedback)
  const readonlyView = hasExistingFeedback && !isEditing

  return (
    <div className="page-surface">
      <Container>
        <div className="mx-auto flex max-w-4xl flex-col gap-10 py-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              to={`/course/${actualCourseId}/overview`}
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-[var(--primary-cyan)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft size={16} />
              Back to overview
            </Link>
            <div className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Feedback · Reflection
            </div>
          </div>

          <section className="microservice-card refined space-y-6" style={{ textAlign: 'left' }}>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-3xl bg-[var(--gradient-secondary)] p-4 text-white shadow-lg">
                <MessageSquare className="h-9 w-9" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
                  Share your experience
                </h1>
                <p className="text-base leading-7 text-[var(--text-secondary)]">
                  Help us improve <strong>{course?.title || course?.course_name || 'the course'}</strong> by rating the learning experience and adding insights.
                  Your perspective informs recommendations and future iterations.
                </p>
              </div>
            </div>

            {communityStats && (
              <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-white/90 p-6 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Community sentiment</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Average rating from {communityStats.total_responses || 'recent'} responses.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-2xl font-bold text-[var(--text-primary)]">
                    {communityStats.average_rating?.toFixed(1)}
                    <Star size={24} className="text-yellow-400" fill="currentColor" />
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-white/95 p-6 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      Overall rating
                    </div>
                    {renderStars(rating, isEditing ? setRating : undefined, isEditing)}
                    <div className="text-sm text-[var(--text-secondary)]">
                      {rating === 0
                        ? 'Select a rating'
                        : rating === 1
                          ? 'Needs significant improvement'
                          : rating === 2
                            ? 'Below expectations'
                            : rating === 3
                              ? 'Met expectations'
                              : rating === 4
                                ? 'Strong experience'
                                : 'Exceptional experience'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-[var(--text-primary)]">
                      Additional comments (optional)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={6}
                      className="w-full resize-none rounded-2xl border border-[rgba(148,163,184,0.2)] bg-white/90 p-4 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--primary-cyan)] focus:ring-2 focus:ring-[var(--primary-cyan)]/30"
                      placeholder="Tell us about your experience, what resonated, or what could be improved..."
                      readOnly={!isEditing}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-[var(--text-primary)]">Tag this experience</label>
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Optional
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tagOptions.map((tag) => {
                        const active = tags.includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => (isEditing ? toggleTag(tag) : null)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              active
                                ? 'bg-[rgba(14,165,233,0.18)] text-[#0f766e] border border-[rgba(14,165,233,0.3)]'
                                : 'bg-[rgba(148,163,184,0.12)] text-[var(--text-muted)]'
                            } ${!isEditing ? 'cursor-default opacity-70' : 'hover:opacity-80'}`}
                          >
                            #{tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[rgba(148,163,184,0.16)] pt-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Sparkles size={16} className="text-[var(--primary-cyan)]" />
                  Feedback informs future cohorts, adaptive recommendations, and assessment improvements.
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {readonlyView ? (
                    <>
                      <Button variant="secondary" onClick={startEdit}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit feedback
                      </Button>
                      <Button variant="secondary" onClick={handleDelete} disabled={formLoading}>
                        {formLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={cancelEdit} disabled={formLoading}>
                        Cancel
                      </Button>
                      <Button variant="primary" type="submit" disabled={formLoading}>
                        {formLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : hasExistingFeedback ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Update feedback
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Submit feedback
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </section>
        </div>
      </Container>
    </div>
  )
}

