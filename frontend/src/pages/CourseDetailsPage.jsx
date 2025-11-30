import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getCourseById, registerLearner, cancelEnrollment, getMyFeedback, fetchEnrollmentStatus } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import CourseOverview from '../components/course/CourseOverview.jsx'
import CourseStructureSidebar from '../components/course/CourseStructureSidebar.jsx'
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
  // Dedicated enrollment state - synced with backend
  // 3-State Enrollment System
  // STATE 1: NOT ENROLLED (enrolled: false)
  // STATE 2: ENROLLED BUT NOT STARTED (enrolled: true, progress: 0)
  // STATE 3: IN PROGRESS (enrolled: true, progress > 0)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(0)

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
      // STEP 1: ALWAYS fetch enrollment status from backend (source of truth)
      // This is the ONLY source of truth for enrollment state
      let enrollmentData = { enrolled: false, progress: 0, completedLessons: 0 }
      if (learnerId) {
        enrollmentData = await fetchEnrollmentStatus(id, learnerId)
      }
      
      // Set 3-state enrollment system from backend
      setIsEnrolled(enrollmentData.enrolled)
      setProgress(enrollmentData.progress || 0)
      setCompletedLessons(enrollmentData.completedLessons || 0)
      
      // Load course details
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

      // For personalized courses: Auto-enroll silently in background if not enrolled
      if (courseIsPersonalized && !enrollmentData.enrolled && learnerId) {
        registerLearner(id, {
          learner_id: learnerId,
          learner_name: userProfile?.name,
          learner_company: userProfile?.company
        }).catch((err) => {
          if (err.response?.status !== 409) {
            console.warn('Background auto-enrollment failed for personalized course:', err)
          }
        })
        // For personalized courses, treat as enrolled immediately
        setIsEnrolled(true)
        setProgress(0)
        setCompletedLessons(0)
      }

      // Set learner progress for backward compatibility (but use enrollment status as source of truth)
      const progress = enrichedCourse.learner_progress || null
      setLearnerProgress(progress)

      // Check if learner has existing feedback
      let feedbackExists = false
      if (learnerId && enrollmentData.enrolled) {
        try {
          const feedbackData = await getMyFeedback(id)
          if (feedbackData && typeof feedbackData === 'object' && (feedbackData.id || feedbackData.rating)) {
            feedbackExists = true
          }
        } catch (err) {
          console.warn('Failed to load feedback:', err)
          feedbackExists = false
        }
      }

      setCourse(enrichedCourse)
      setHasFeedback(feedbackExists)
    } catch (err) {
      const message = err.message || 'Failed to load course'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [id, learnerId, showToast, isPersonalizedFlow, userProfile])

  useEffect(() => {
    loadCourse()
  }, [id, loadCourse])

  // Determine if course is personalized (declare once)
  const isPersonalizedCourse = isPersonalizedFlow || metadataPersonalized

  // Note: isEnrolled is now a state variable, set from backend response

  // Get first lesson ID for navigation - MUST be before any early returns
  const flattenedLessons = useMemo(() => {
    if (!course) return []
    const topics = Array.isArray(course.topics) ? course.topics : []
    if (topics.length > 0) {
      const lessons = topics.flatMap((topic) => (topic.modules || []).flatMap((module) => module.lessons || []))
      return lessons
    }
    if (Array.isArray(course.modules)) {
      return course.modules.flatMap((module) => module.lessons || [])
    }
    if (Array.isArray(course.lessons)) {
      return course.lessons
    }
    return []
  }, [course])

  const firstLesson = flattenedLessons[0]
  const firstLessonId = firstLesson?.id || firstLesson?.lesson_id

  const handleEnrollment = async () => {
    // Personalized courses: Navigate directly to first lesson (no enrollment API call)
    if (isPersonalizedCourse) {
      if (firstLessonId) {
        navigate(`/course/${id}/lesson/${firstLessonId}`)
      } else {
        navigate(`/course/${id}/overview`)
      }
      return
    }

    // Prevent re-enrollment if already enrolled
    if (isEnrolled) {
      showToast('You are already enrolled in this course.', 'info')
      if (firstLessonId) {
        navigate(`/course/${id}/lesson/${firstLessonId}`)
      } else {
        navigate(`/course/${id}/overview`)
      }
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
      
      // Wait for database transaction to commit
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // STEP 2: Re-fetch enrollment status from backend (source of truth)
      const enrollmentData = await fetchEnrollmentStatus(id, learnerId)
      
      // STEP 3: Update state to STATE 2 (ENROLLED BUT NOT STARTED)
      setIsEnrolled(enrollmentData.enrolled)
      setProgress(enrollmentData.progress || 0)
      setCompletedLessons(enrollmentData.completedLessons || 0)
      
      // Update learner progress for backward compatibility
      const params = learnerId ? { learner_id: learnerId } : undefined
      const updatedCourse = await getCourseById(id, params)
      if (updatedCourse?.learner_progress) {
        setLearnerProgress(updatedCourse.learner_progress)
      }
      if (updatedCourse) {
        setCourse(updatedCourse)
      }
      
      showToast('Enrollment confirmed! You can now explore the full course structure.', 'success')
      setModalOpen(false)
      if (firstLessonId) {
        navigate(`/course/${id}/lesson/${firstLessonId}`)
      } else {
        navigate(`/course/${id}/overview`)
      }
    } catch (err) {
      // Safely check error properties to avoid initialization errors
      let is409 = false
      let errorMsg = 'Registration failed'
      
      try {
        if (err && typeof err === 'object') {
          const response = 'response' in err ? err.response : null
          if (response && typeof response === 'object' && 'status' in response) {
            is409 = response.status === 409
          }
          
          // Safely extract error message
          if (response && typeof response === 'object' && 'data' in response) {
            const data = response.data
            if (data && typeof data === 'object' && 'message' in data) {
              errorMsg = String(data.message)
            }
          } else if ('message' in err) {
            errorMsg = String(err.message)
          }
        }
      } catch (checkErr) {
        // If we can't safely access error properties, use default message
        console.warn('Error accessing error properties:', checkErr)
      }
      
      if (is409) {
        // Already enrolled (409) - refetch course details to get actual enrollment status
        try {
          const params = learnerId ? { learner_id: learnerId } : undefined
          const updatedCourse = await getCourseById(id, params)
          if (updatedCourse?.learner_progress) {
            setLearnerProgress(updatedCourse.learner_progress)
            setIsEnrolled(updatedCourse.learner_progress.is_enrolled === true)
            setCourse(updatedCourse)
          } else {
            // Assume enrolled if we got 409
            setLearnerProgress((prev) => prev || {
              is_enrolled: true,
              registration_id: null,
              progress: 0,
              status: 'in_progress',
              completed_lessons: []
            })
            setIsEnrolled(true)
          }
        } catch (refetchErr) {
          console.warn('Failed to refetch course details after enrollment:', refetchErr)
          // Assume enrolled if we got 409
          setLearnerProgress((prev) => prev || {
            is_enrolled: true,
            registration_id: null,
            progress: 0,
            status: 'in_progress',
            completed_lessons: []
          })
          setIsEnrolled(true)
        }
        showToast('You are already enrolled in this course.', 'info')
        setModalOpen(false)
        if (firstLessonId) {
          navigate(`/course/${id}/lesson/${firstLessonId}`)
        } else {
          navigate(`/course/${id}/overview`)
        }
      } else {
        setError(errorMsg)
        showToast(errorMsg, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEnrollment = async () => {
    if (!learnerId) {
      showToast('Switch to the learner workspace to cancel enrollment.', 'info')
      return
    }

    // STEP 1: Show confirm modal
    const confirmed = window.confirm(
      'Are you sure you want to cancel your enrollment?\n\nYour progress will be cleared.'
    )
    if (!confirmed) {
      return
    }

    setSubmitting(true)
    try {
      // STEP 2: Call DELETE endpoint
      await cancelEnrollment(id, {
        learner_id: learnerId
      })
      
      // STEP 3: Immediately reset to STATE 1 (NOT ENROLLED)
      setIsEnrolled(false)
      setProgress(0)
      setCompletedLessons(0)
      setLearnerProgress({
        is_enrolled: false,
        completed_lessons: []
      })
      
      // Wait for database transaction to commit
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // STEP 4: Re-fetch enrollment status from backend to confirm
      const enrollmentData = await fetchEnrollmentStatus(id, learnerId)
      
      // STEP 5: Update state based on backend confirmation (should be STATE 1)
      setIsEnrolled(enrollmentData.enrolled)
      setProgress(enrollmentData.progress || 0)
      setCompletedLessons(enrollmentData.completedLessons || 0)
      
      // Clear learner progress
      setLearnerProgress({
        is_enrolled: false,
        completed_lessons: []
      })
      
      showToast('Enrollment cancelled successfully. Course removed from your library.', 'success')
    } catch (err) {
      let errorMsg = 'Failed to cancel enrollment'
      
      try {
        if (err && typeof err === 'object') {
          const response = 'response' in err ? err.response : null
          if (response && typeof response === 'object' && 'data' in response) {
            const data = response.data
            if (data && typeof data === 'object' && 'message' in data) {
              errorMsg = String(data.message)
            }
          } else if ('message' in err) {
            errorMsg = String(err.message)
          }
        }
      } catch (checkErr) {
        console.warn('Error accessing error properties:', checkErr)
      }
      
      setError(errorMsg)
      showToast(errorMsg, 'error')
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
            <i className="fa-solid fa-triangle-exclamation text-4xl" style={{ color: 'var(--accent-orange)' }} aria-hidden="true" />
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
      <div className="page-surface bg-[var(--bg-primary)] min-h-screen transition-colors">
        <div className="flex flex-col lg:flex-row gap-6 py-4">
          {/* Left Sidebar - Fixed to left edge */}
          <aside className="w-full lg:w-[320px] lg:pl-6 shrink-0">
            <CourseStructureSidebar
              course={course}
              learnerProgress={learnerProgress}
              currentLessonId={null}
              userRole={userRole}
              isEnrolled={isEnrolled}
              onSelectLesson={(lessonId) => navigate(`/course/${id}/lesson/${lessonId}`)}
            />
          </aside>

          {/* Main Content - Centered in remaining space */}
          <main className="flex-1">
            <Container>
              <div className="max-w-5xl mx-auto pt-2">
                <CourseOverview
                  course={course}
                  isEnrolled={isEnrolled}
                  onEnrollClick={() => {
                    // Prevent opening modal if already enrolled
                    if (isEnrolled) {
                      showToast('You are already enrolled in this course.', 'info')
                      return
                    }
                    setModalOpen(true)
                  }}
                  onCancelEnrollment={handleCancelEnrollment}
                  isSubmitting={isSubmitting}
                  onContinue={
                    firstLessonId
                      ? () => navigate(`/course/${id}/lesson/${firstLessonId}`)
                      : () => navigate(`/course/${id}/overview`)
                  }
                  showStructureCta={userRole === 'learner'}
                  learnerProfile={userProfile}
                  progress={progress}
                  completedLessons={completedLessons}
                  progressSummary={learnerProgress}
                  backLink={isPersonalizedFlow ? '/learner/personalized' : '/learner/marketplace'}
                  hasFeedback={hasFeedback}
                  courseId={id}
                />
              </div>
            </Container>
          </main>
        </div>
      </div>

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

