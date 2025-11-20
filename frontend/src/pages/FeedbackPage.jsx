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
            className={filled ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)] opacity-40'}
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

  // Draft state for editing (only updated when user makes changes, not saved until "Save Changes" is clicked)
  const [draftFeedback, setDraftFeedback] = useState({
    rating: 5,
    comment: '',
    tags: []
  })

  // Display state (for view mode)
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
          // Initialize draft with existing feedback data
          setDraftFeedback({
            rating: Number(learnerFeedback.rating) || 5,
            comment: learnerFeedback.comment || '',
            tags: Array.isArray(learnerFeedback.tags) ? learnerFeedback.tags : []
          })
          setIsEditing(false) // Start in view mode
        } else {
          setExistingFeedback(null)
          setRating(5)
          setComment('')
          setTags([])
          // Initialize draft for new feedback
          setDraftFeedback({
            rating: 5,
            comment: '',
            tags: []
          })
          setIsEditing(true) // Start in edit mode for new feedback
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
    if (!isEditing) return
    setDraftFeedback((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
    }))
  }

  const startEdit = () => {
    // Only toggle edit mode - NO API call
    if (existingFeedback) {
      // Initialize draft with existing feedback data
      setDraftFeedback({
        rating: Number(existingFeedback.rating) || 5,
        comment: existingFeedback.comment || '',
        tags: Array.isArray(existingFeedback.tags) ? existingFeedback.tags : []
      })
    }
    setIsEditing(true)
  }

  const cancelEdit = () => {
    if (existingFeedback) {
      // Reset draft to existing feedback values
      setDraftFeedback({
        rating: Number(existingFeedback.rating) || 5,
        comment: existingFeedback.comment || '',
        tags: Array.isArray(existingFeedback.tags) ? existingFeedback.tags : []
      })
      setIsEditing(false)
    } else {
      // For new feedback, navigate away
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

  const handleSaveChanges = async () => {
    // Only allow save when in editing mode
    if (!isEditing) {
      showToast('Click "Edit feedback" to make changes.', 'info')
      return
    }

    const numericRating = Number(draftFeedback.rating)
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
        // Update existing feedback - ONLY called when user clicks "Save Changes"
        const updatedFeedback = await updateFeedback(actualCourseId, {
          rating: numericRating,
          tags: draftFeedback.tags.length > 0 ? draftFeedback.tags : ['General'],
          comment: draftFeedback.comment.trim()
        })
        showToast('Feedback updated successfully!', 'success')
        
        // Update local state with new feedback data
        const updatedData = {
          ...existingFeedback,
          rating: numericRating,
          tags: draftFeedback.tags.length > 0 ? draftFeedback.tags : ['General'],
          comment: draftFeedback.comment.trim()
        }
        setExistingFeedback(updatedData)
        setRating(numericRating)
        setComment(draftFeedback.comment.trim())
        setTags(draftFeedback.tags.length > 0 ? draftFeedback.tags : ['General'])
        
        setIsEditing(false) // Exit edit mode after successful update
        
        // Redirect to course overview after save
        setTimeout(() => {
          navigate(`/course/${actualCourseId}/overview`, { replace: true })
        }, 1000)
      } else {
        // Submit new feedback
        await submitFeedback(actualCourseId, {
          learner_id: learnerId,
          learner_name: userProfile?.name,
          rating: numericRating,
          tags: draftFeedback.tags.length > 0 ? draftFeedback.tags : ['General'],
          comment: draftFeedback.comment.trim()
        })
        showToast('Feedback submitted successfully! Thank you!', 'success')
        // Redirect to course overview immediately after submit
        setTimeout(() => {
          navigate(`/course/${actualCourseId}/overview`, { replace: true })
        }, 1000)
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to submit feedback'
      showToast(message, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="page-surface bg-[var(--bg-primary)] transition-colors">
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
    <div className="page-surface bg-[var(--bg-primary)] transition-colors">
      <Container>
        <div className="mx-auto flex max-w-4xl flex-col gap-6 py-6">
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
              <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/90 p-6 shadow-sm backdrop-blur transition-colors">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Community sentiment</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Average rating from {communityStats.total_ratings || 'recent'} responses.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-2xl font-bold text-[var(--text-primary)]">
                    {communityStats.average_rating?.toFixed(1)}
                    <Star size={24} className="text-[var(--accent-gold)]" fill="currentColor" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {isEditing ? (
                // EDIT MODE: Show editable inputs using draftFeedback
                <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/95 p-6 shadow-sm backdrop-blur transition-colors">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Overall rating
                      </div>
                      {renderStars(draftFeedback.rating, (value) => setDraftFeedback(prev => ({ ...prev, rating: value })), true)}
                      <div className="text-sm text-[var(--text-secondary)]">
                        {draftFeedback.rating === 0
                          ? 'Select a rating'
                          : draftFeedback.rating === 1
                            ? 'Needs significant improvement'
                            : draftFeedback.rating === 2
                              ? 'Below expectations'
                              : draftFeedback.rating === 3
                                ? 'Met expectations'
                                : draftFeedback.rating === 4
                                  ? 'Strong experience'
                                  : 'Exceptional experience'}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-[var(--text-primary)]">
                        Additional comments (optional)
                      </label>
                      <textarea
                        value={draftFeedback.comment}
                        onChange={(e) => setDraftFeedback(prev => ({ ...prev, comment: e.target.value }))}
                        rows={6}
                        className="w-full resize-none rounded-2xl border border-[rgba(148,163,184,0.2)] bg-[var(--bg-card)]/90 p-4 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--primary-cyan)] focus:ring-2 focus:ring-[var(--primary-cyan)]/30"
                        placeholder="Tell us about your experience, what resonated, or what could be improved..."
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
                          const active = draftFeedback.tags.includes(tag)
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                active
                                  ? 'status-chip status-chip-info'
                                  : 'status-chip'
                              } hover:opacity-80`}
                            >
                              #{tag}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // VIEW MODE: Show read-only display using existingFeedback
                <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/95 p-6 shadow-sm backdrop-blur transition-colors">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Overall rating
                      </div>
                      {renderStars(rating, undefined, false)}
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
                      <div className="w-full rounded-2xl border border-[rgba(148,163,184,0.2)] bg-[var(--bg-card)]/90 p-4 text-sm text-[var(--text-primary)]">
                        {comment || <span className="text-[var(--text-muted)] italic">No comments provided</span>}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-[var(--text-primary)]">Tag this experience</label>
                        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                          Optional
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.length > 0 ? (
                          tags.map((tag) => (
                            <span
                              key={tag}
                              className="status-chip status-chip-info"
                            >
                              #{tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] italic">No tags selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-[rgba(148,163,184,0.16)] pt-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Sparkles size={16} className="text-[var(--primary-cyan)]" />
                  Feedback informs future cohorts, adaptive recommendations, and assessment improvements.
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {readonlyView ? (
                    // VIEW MODE: Show Edit and Delete buttons
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
                    // EDIT MODE: Show Cancel and Save Changes buttons
                    <>
                      <Button variant="secondary" onClick={cancelEdit} disabled={formLoading}>
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={handleSaveChanges} disabled={formLoading}>
                        {formLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : hasExistingFeedback ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Save Changes
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
            </div>
          </section>
        </div>
      </Container>
    </div>
  )
}

