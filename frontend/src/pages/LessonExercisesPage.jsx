import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, ArrowRight, Code } from 'lucide-react'
import { getLessonById, getCourseById } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import DevLabExerciseRenderer from '../components/DevLabExerciseRenderer.jsx'
import CourseStructureSidebar from '../components/course/CourseStructureSidebar.jsx'
import { useApp } from '../context/AppContext.jsx'
import Container from '../components/Container.jsx'
import Button from '../components/Button.jsx'

export default function LessonExercisesPage() {
  const { id: courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const { showToast, userRole, userProfile } = useApp()
  const learnerId = userRole === 'learner' ? userProfile?.id : null

  const [loading, setLoading] = useState(true)
  const [lesson, setLesson] = useState(null)
  const [course, setCourse] = useState(null)
  const [learnerProgress, setLearnerProgress] = useState(null)

  const loadData = async () => {
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
    } catch (err) {
      showToast('Unable to load exercises. Please try again later.', 'error')
      navigate(`/course/${courseId}/lesson/${lessonId}`, { replace: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [courseId, lessonId, learnerId])

  // Get lesson navigation
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
  const nextLesson = currentIndex >= 0 && currentIndex < flattenedLessons.length - 1 
    ? flattenedLessons[currentIndex + 1] 
    : null
  const isFinalLesson = currentIndex >= 0 && !nextLesson

  if (loading) {
    return (
      <div className="page-surface bg-[var(--bg-primary)] transition-colors">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Loading exercises..." />
          </div>
        </Container>
      </div>
    )
  }

  if (!lesson || !course) {
    return (
      <div className="page-surface bg-[var(--bg-primary)] transition-colors">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] flex-col items-center justify-center gap-4">
            <p className="text-lg font-semibold text-[var(--text-primary)]">Exercises not found</p>
            <button
              onClick={() => navigate(`/course/${courseId}/lesson/${lessonId}`)}
              className="mt-4 rounded-full bg-[var(--primary-cyan)] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-cyan-strong)]"
            >
              Back to Lesson
            </button>
          </div>
        </Container>
      </div>
    )
  }

  const hasExercises = lesson.devlab_exercises && Array.isArray(lesson.devlab_exercises) && lesson.devlab_exercises.length > 0

  if (!hasExercises) {
    return (
      <div className="page-surface bg-[var(--bg-primary)] transition-colors">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] flex-col items-center justify-center gap-4">
            <p className="text-lg font-semibold text-[var(--text-primary)]">No exercises available</p>
            <p className="text-sm text-[var(--text-secondary)]">This lesson doesn't have any exercises.</p>
            <button
              onClick={() => navigate(`/course/${courseId}/lesson/${lessonId}`)}
              className="mt-4 rounded-full bg-[var(--primary-cyan)] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-cyan-strong)]"
            >
              Back to Lesson
            </button>
          </div>
        </Container>
      </div>
    )
  }

  const lessonTitle = lesson?.title || lesson?.lesson_name || 'Lesson'
  const courseTitle = course?.title || course?.course_name || 'Course'

  return (
    <div className="page-surface bg-[var(--bg-primary)] min-h-screen transition-colors">
      <div className="flex flex-col lg:flex-row gap-6 py-4">
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[320px] lg:pl-6 shrink-0">
          <CourseStructureSidebar
            course={course}
            learnerProgress={learnerProgress}
            currentLessonId={normalizedLessonId}
            userRole={userRole}
            onSelectLesson={(targetLessonId) => navigate(`/course/${courseId}/lesson/${targetLessonId}`)}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <Container>
            <div className="max-w-5xl mx-auto pt-2">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <button
                    onClick={() => navigate(`/course/${courseId}/lesson/${lessonId}`)}
                    className="inline-flex items-center gap-2 hover:text-[var(--primary-cyan)]"
                  >
                    <ArrowLeft size={16} />
                    Back to lesson
                  </button>
                  <span className="text-[var(--text-muted)]">›</span>
                  <span className="font-semibold text-[var(--text-primary)]">Exercises</span>
                </div>
                <div className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Exercises · Practice
                </div>
              </div>

              <section className="microservice-card refined space-y-6" style={{ textAlign: 'left' }}>
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="rounded-3xl bg-[var(--gradient-secondary)] p-4 text-white shadow-lg">
                    <Code className="h-9 w-9" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
                      Practice Exercises
                    </h1>
                    <p className="text-base leading-7 text-[var(--text-secondary)]">
                      Hands-on coding practice for <strong>{lessonTitle}</strong> from <strong>{courseTitle}</strong>
                    </p>
                  </div>
                </div>

                {/* DevLab Exercises */}
                <div className="space-y-6">
                  {lesson.devlab_exercises.map((exercise, index) => {
                    // Handle both formats: string array or object array with html property
                    const htmlContent = typeof exercise === 'string' ? exercise : (exercise?.html || exercise)
                    return (
                      <div key={index} className="space-y-3">
                        {lesson.devlab_exercises.length > 1 && (
                          <div className="text-sm font-semibold text-[var(--text-primary)]">
                            Exercise {index + 1} of {lesson.devlab_exercises.length}
                          </div>
                        )}
                        <DevLabExerciseRenderer html={htmlContent} />
                      </div>
                    )
                  })}
                </div>

                {/* Navigation */}
                <div className="flex flex-col gap-3 border-t border-[rgba(148,163,184,0.16)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/course/${courseId}/lesson/${lessonId}`)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Lesson
                  </Button>
                  {nextLesson ? (
                    <Button
                      variant="primary"
                      onClick={() => {
                        const nextLessonId = nextLesson.id || nextLesson.lesson_id
                        // Navigate to next lesson (it will show exercises button if available)
                        navigate(`/course/${courseId}/lesson/${nextLessonId}`)
                      }}
                    >
                      Next Lesson
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/course/${courseId}/lesson/${lessonId}`)}
                    >
                      Continue to Assessment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </section>
            </div>
          </Container>
        </main>
      </div>
    </div>
  )
}

