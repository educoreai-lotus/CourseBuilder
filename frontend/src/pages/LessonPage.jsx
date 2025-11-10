import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { getLessonById, getCourseById, updateCourseProgress } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import LessonView from '../components/course/LessonView.jsx'
import { useApp } from '../context/AppContext'

export default function LessonPage() {
  const { id: courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const { showToast, userRole, userProfile } = useApp()
  const learnerId = userRole === 'learner' ? userProfile?.id : null

  const [loading, setLoading] = useState(true)
  const [lesson, setLesson] = useState(null)
  const [course, setCourse] = useState(null)
  const [completedLessons, setCompletedLessons] = useState([])
  const [learnerProgress, setLearnerProgress] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = learnerId ? { learner_id: learnerId } : undefined
      const [courseResponse, lessonResponse] = await Promise.all([
        getCourseById(courseId, params),
        getLessonById(lessonId)
      ])
      setCourse(courseResponse)
      setLesson(lessonResponse)
      const progress = courseResponse.learner_progress || null
      setLearnerProgress(progress)
      if (progress?.completed_lessons) {
        setCompletedLessons(progress.completed_lessons.map(String))
      } else {
        setCompletedLessons([])
      }
    } catch (err) {
      showToast('Unable to load lesson. Please try again later.', 'error')
      navigate(`/course/${courseId}/structure`, { replace: true })
    } finally {
      setLoading(false)
    }
  }, [courseId, lessonId, learnerId, navigate, showToast])

  useEffect(() => {
    loadData()
  }, [courseId, lessonId, loadData])

  useEffect(() => {
    if (!loading && learnerProgress && !learnerProgress.is_enrolled && userRole === 'learner') {
      navigate(`/course/${courseId}/overview`, { replace: true })
    }
  }, [courseId, learnerProgress, loading, navigate, userRole])

  const flattenedLessons = useMemo(() => {
    if (!course) return []
    const topics = Array.isArray(course.topics) ? course.topics : []
    if (topics.length > 0) {
      return topics.flatMap(topic => (topic.modules || []).flatMap(module => module.lessons || []))
    }
    if (Array.isArray(course.modules)) {
      return course.modules.flatMap(module => module.lessons || [])
    }
    if (Array.isArray(course.lessons)) {
      return course.lessons
    }
    return []
  }, [course])

  const currentIndex = flattenedLessons.findIndex(item => (item.id || item.lesson_id || '').toString() === lessonId)
  const previousLesson = currentIndex > 0 ? flattenedLessons[currentIndex - 1] : null
  const nextLesson = currentIndex >= 0 && currentIndex < flattenedLessons.length - 1 ? flattenedLessons[currentIndex + 1] : null

  const handleComplete = async () => {
    if (!lessonId) return

    if (!learnerId) {
      showToast('Progress tracking is available for learners only.', 'info')
      return false
    }

    try {
      const result = await updateCourseProgress(courseId, {
        learner_id: learnerId,
        lesson_id: lessonId,
        completed: true
      })
      setCompletedLessons(result.completed_lessons.map(String))
      setLearnerProgress((prev) => ({
        ...(prev || {}),
        is_enrolled: true,
        registration_id: result.registration_id,
        progress: result.progress,
        status: result.status,
        completed_lessons: result.completed_lessons
      }))
      showToast('Lesson marked as complete. Great progress!', 'success')
      return true
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Unable to update progress'
      showToast(message, 'error')
      return false
    }
  }

  if (userRole === 'learner' && !learnerProgress?.is_enrolled && !loading) {
    return null
  }

  if (loading) {
    return (
      <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading lesson..." />
      </div>
    )
  }

  const allLessonsCompleted = flattenedLessons.length > 0 && completedLessons.length >= flattenedLessons.length
  const completionSummary = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.9rem', color: allLessonsCompleted ? '#047857' : 'var(--text-secondary)' }}>
      {allLessonsCompleted ? (
        <>
          <i className="fa-solid fa-unlock" />
          Exercises & exam unlocked
        </>
      ) : (
        <>
          <i className="fa-solid fa-lock" />
          Complete all lessons to unlock exercises and exam
        </>
      )}
    </div>
  )

  return (
    <LessonView
      courseTitle={course?.title || course?.course_name}
      lesson={lesson}
      onPrevious={previousLesson ? () => navigate(`/course/${courseId}/lesson/${previousLesson.id || previousLesson.lesson_id}`) : undefined}
      onNext={nextLesson ? () => navigate(`/course/${courseId}/lesson/${nextLesson.id || nextLesson.lesson_id}`) : undefined}
      onComplete={handleComplete}
      isCompleted={completedLessons.includes(lessonId)}
      completionSummary={completionSummary}
    />
  )
}
