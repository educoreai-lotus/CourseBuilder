import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getCourseById, registerLearner, getMyFeedback } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import CourseOverview from '../components/course/CourseOverview.jsx'
import EnrollModal from '../components/course/EnrollModal.jsx'
import { useApp } from '../context/AppContext'
import Container from '../components/Container.jsx'
import { isPersonalized } from '../utils/courseTypeUtils.js'

export default function CourseDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast, userRole, userProfile } = useApp()
  const learnerId = userRole === 'learner' ? userProfile?.id : null
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setModalOpen] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)
  const [learnerProgress, setLearnerProgress] = useState(null)
  const [hasFeedback, setHasFeedback] = useState(false)

  const isPersonalizedFlow = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('personalized') === 'true'
  }, [location.search])

  const metadataPersonalized = useMemo(
    () => isPersonalized(course),
    [course]
  )

  const loadCourse = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = learnerId ? { learner_id: learnerId } : undefined
      const data = await getCourseById(id, params)
      const courseIsPersonalized = isPersonalizedFlow || isPersonalized(data)
      const enrichedCourse = courseIsPersonalized
        ? {
            ...data,
            metadata: {
              ...(data.metadata || {}),
              personalized: true,
              source: data.metadata?.source || 'learner_ai'
            }
          }
        : data

      const personalizedProgress = async () => {
        if (!courseIsPersonalized) {
          return enrichedCourse.learner_progress || null
        }

        const existing = enrichedCourse.learner_progress || {}
        
        // For personalized courses: Auto-enroll silently in background if not enrolled
        // But don't block UI - treat as enrolled immediately
        if (!existing.is_enrolled && learnerId) {
          // Auto-enroll in background (fire and forget)
          registerLearner(id, {
            learner_id: learnerId,
            learner_name: userProfile?.name,
            learner_company: userProfile?.company
          }).catch((err) => {
            // Silently handle errors - don't block user experience
            if (err.response?.status !== 409) {
              console.warn('Background auto-enrollment failed for personalized course:', err)
            }
          })
        }
        
        // Always return enrolled status for personalized courses (no API call blocking)
        return {
          ...existing,
          is_enrolled: true,
          status: existing.status || 'in_progress',
          progress: existing.progress ?? 0,
          completed_lessons: existing.completed_lessons || []
        }
      }
      
      const progress = await personalizedProgress()

      // Determine if course is enrolled
      const isEnrolledCheck = courseIsPersonalized || progress?.is_enrolled

      // Check if learner has existing feedback
      // 404 is normal when no feedback exists yet - getMyFeedback returns null for 404
      let feedbackExists = false
      if (learnerId && isEnrolledCheck) {
        try {
          const feedbackData = await getMyFeedback(id)
          if (feedbackData && typeof feedbackData === 'object' && (feedbackData.id || feedbackData.rating)) {
            feedbackExists = true
          }
        } catch (err) {
          // Other errors (non-404) - log but don't break UI
          console.warn('Failed to load feedback:', err)
          feedbackExists = false
        }
      }

      setCourse(enrichedCourse)
      setLearnerProgress(progress)
      setHasFeedback(feedbackExists)
    } catch (err) {
      const message = err.message || 'Failed to load course'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [id, learnerId, showToast, isPersonalizedFlow, userProfile])
  
  // Determine if course is personalized
  const isPersonalizedCourse = isPersonalizedFlow || metadataPersonalized

  useEffect(() => {
    loadCourse()
  }, [id, loadCourse])

  // Personalized courses are automatically enrolled - no enrollment needed
  const isEnrolled = isPersonalizedCourse || learnerProgress?.is_enrolled

  const handleEnrollment = async () => {
    // Personalized courses: Navigate directly to course structure (no enrollment API call)
    if (isPersonalizedCourse) {
      navigate(`/course/${id}/structure`)
      return
    }

    if (isEnrolled) {
      navigate(`/course/${id}/structure`)
      return
    }

    if (!learnerId) {
      showToast('Switch to the learner workspace to enrol.', 'info')
      return
    }

    setSubmitting(true)
    try {
      const response = await registerLearner(id, {
        learner_id: learnerId,
        learner_name: userProfile?.name,
        learner_company: userProfile?.company
      })
      setLearnerProgress({
        is_enrolled: true,
        registration_id: response.registration_id,
        progress: response.progress ?? 0,
        status: 'in_progress',
        completed_lessons: []
      })
      showToast('Enrollment confirmed! You can now explore the full course structure.', 'success')
      setModalOpen(false)
      navigate(`/course/${id}/structure`)
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('You are already enrolled in this course.', 'info')
        setLearnerProgress((prev) => prev || {
          is_enrolled: true,
          registration_id: null,
          progress: 0,
          status: 'in_progress',
          completed_lessons: []
        })
        setModalOpen(false)
        navigate(`/course/${id}/structure`)
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Registration failed'
        setError(errorMsg)
        showToast(errorMsg, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-surface">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Loading course..." />
          </div>
        </Container>
      </div>
    )
  }

  if (!course || error) {
    return (
      <div className="page-surface">
        <Container>
          <section className="surface-card soft flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
            <i className="fa-solid fa-triangle-exclamation text-4xl text-[#f97316]" aria-hidden="true" />
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              {error || 'Course not found'}
            </h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/learner/marketplace')}
            >
              Browse courses
            </button>
          </section>
        </Container>
      </div>
    )
  }

  const learnerName = userRole === 'learner' ? userProfile?.name : null

  return (
    <>
      <CourseOverview
        course={course}
        isEnrolled={isEnrolled}
        onEnrollClick={() => setModalOpen(true)}
        onContinue={() => navigate(`/course/${id}/structure`)}
        showStructureCta={userRole === 'learner'}
        learnerProfile={userProfile}
        progressSummary={learnerProgress}
        backLink={isPersonalizedFlow ? '/learner/personalized' : '/learner/marketplace'}
        hasFeedback={hasFeedback}
        courseId={id}
      />

      {!isPersonalizedFlow && (
        <EnrollModal
          isOpen={isModalOpen}
          learnerName={learnerName}
          onConfirm={handleEnrollment}
          onClose={() => setModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  )
}

