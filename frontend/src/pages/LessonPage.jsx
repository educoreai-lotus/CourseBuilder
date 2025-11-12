import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getLessonById,
  getCourseById,
  updateCourseProgress,
  fetchEnrichmentAssets
} from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import LessonView from '../components/course/LessonView.jsx'
import { useApp } from '../context/AppContext'
import Container from '../components/Container.jsx'

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
  const [assetData, setAssetData] = useState(null)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetError, setAssetError] = useState(null)

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

  const normalizedLessonId = lessonId?.toString() || ''
  const currentIndex = flattenedLessons.findIndex(
    (item) => (item.id || item.lesson_id || '').toString() === normalizedLessonId
  )
  const currentLessonMeta = currentIndex >= 0 ? flattenedLessons[currentIndex] : null
  const previousLesson = currentIndex > 0 ? flattenedLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex >= 0 && currentIndex < flattenedLessons.length - 1 ? flattenedLessons[currentIndex + 1] : null
  const isFinalLesson = currentIndex >= 0 && !nextLesson

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
      <div className="page-surface bg-[var(--bg-primary)] transition-colors">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Loading lesson..." />
          </div>
        </Container>
      </div>
    )
  }

  const hasCompletedCurrent = completedLessons.includes(normalizedLessonId)
  const allLessonsCompleted = flattenedLessons.length > 0 && completedLessons.length >= flattenedLessons.length
  const canTakeAssessment = isFinalLesson && hasCompletedCurrent
  const handleTakeTest = () => {
    if (!canTakeAssessment) {
      showToast('Complete the final lesson to unlock the assessment.', 'info')
      return
    }
    navigate(`/course/${courseId}/assessment`)
  }
  const completionSummary = isFinalLesson
    ? canTakeAssessment
      ? 'Final assessment ready – take the test when you are ready.'
      : 'Finish this lesson to unlock the assessment.'
    : allLessonsCompleted
      ? 'Exercises and assessment unlocked.'
      : 'Complete remaining lessons to unlock exercises and assessment.'

  useEffect(() => {
    const topicCandidates = [
      lesson?.topic?.topic_name,
      lesson?.topic_name,
      currentLessonMeta?.topic_name,
      currentLessonMeta?.topicName,
      course?.title,
      course?.course_name
    ].map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean)

    const topic = topicCandidates[0] || ''

    const collectSkills = (...sources) => {
      const set = new Set()
      sources.forEach((source) => {
        if (Array.isArray(source)) {
          source.forEach((skill) => {
            if (typeof skill === 'string' && skill.trim()) {
              set.add(skill.trim())
            }
          })
        }
      })
      return Array.from(set).slice(0, 8)
    }

    const lessonSkills =
      lesson?.skills ||
      lesson?.metadata?.skills ||
      lesson?.content_data?.skills ||
      lesson?.content_data?.topics ||
      []

    const courseSkills =
      course?.skills ||
      course?.metadata?.skills ||
      course?.metadata?.topics ||
      []

    const tags = Array.isArray(lesson?.enriched_content?.tags) ? lesson.enriched_content.tags : []
    const skills = collectSkills(lessonSkills, courseSkills, tags)

    if (!topic && skills.length === 0) {
      setAssetData(null)
      setAssetError(null)
      setAssetLoading(false)
      return
    }

    let isMounted = true
    setAssetLoading(true)
    setAssetError(null)

    fetchEnrichmentAssets({
      topic: topic || 'Learning practice',
      skills,
      maxItems: 6
    })
      .then((response) => {
        if (!isMounted) return
        setAssetData(response)
      })
      .catch((err) => {
        if (!isMounted) return
        setAssetError(err)
        setAssetData(null)
      })
      .finally(() => {
        if (!isMounted) return
        setAssetLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [lesson, course, currentLessonMeta])

  return (
    <LessonView
      courseTitle={course?.title || course?.course_name}
      lesson={lesson}
      onPrevious={previousLesson ? () => navigate(`/course/${courseId}/lesson/${previousLesson.id || previousLesson.lesson_id}`) : undefined}
      onNext={
        nextLesson ? () => navigate(`/course/${courseId}/lesson/${nextLesson.id || nextLesson.lesson_id}`) : undefined
      }
      onComplete={handleComplete}
      isCompleted={hasCompletedCurrent}
      completionSummary={completionSummary}
      onTakeTest={isFinalLesson ? handleTakeTest : undefined}
      canTakeTest={canTakeAssessment}
      isFinalLesson={isFinalLesson}
      structureHref={`/course/${courseId}/structure`}
      overviewHref={`/course/${courseId}/overview`}
      assetEnrichment={assetData}
      assetLoading={assetLoading}
      assetError={assetError}
    />
  )
}
