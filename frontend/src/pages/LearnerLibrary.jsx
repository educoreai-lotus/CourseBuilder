import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLearnerProgress } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useCourseProgress } from '../hooks/useCourseProgress.js'

const FALLBACK_LESSON_COUNT = 8

function LibraryCourseCard({ course }) {
  const totalLessons = course.lessons_total || FALLBACK_LESSON_COUNT
  const completedLessons = Math.round((course.progress / 100) * totalLessons)
  const completedStages = [
    'enroll',
    ...(completedLessons >= 1 ? ['lessons'] : []),
    ...(course.progress >= 70 ? ['exercises'] : []),
    ...(course.progress >= 95 ? ['exam'] : []),
    ...(course.status === 'completed' ? ['feedback'] : [])
  ]

  const { isStageComplete, canAccessStage, isLastLessonCompleted } = useCourseProgress({
    courseType: 'marketplace',
    isEnrolled: true,
    completedStages,
    totalLessons,
    completedLessons
  })

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-800/60">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
            Enrolled
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-800 dark:text-slate-100">
            {course.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {`Level: ${course.level || 'beginner'} · Status: ${(course.status || 'in_progress').replace('_', ' ')}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
            Progress
          </span>
          <div className="text-3xl font-bold text-indigo-500 dark:text-indigo-300">
            {Math.round(course.progress)}%
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {completedLessons} / {totalLessons} lessons
          </div>
        </div>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all"
          style={{ width: `${course.progress}%` }}
        />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Link
          to={`/courses/${course.id || course.course_id}`}
          className="group flex flex-col gap-2 rounded-2xl border border-indigo-200 bg-white px-4 py-4 text-left transition hover:border-indigo-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Go to Lessons</span>
            <i className="fa-solid fa-arrow-right text-slate-400 transition group-hover:translate-x-1" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Resume content where you left off
          </p>
        </Link>

        <button
          type="button"
          disabled={!canAccessStage('exercises') || isStageComplete('exercises')}
          className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition ${
            isStageComplete('exercises')
              ? 'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
              : canAccessStage('exercises')
                ? 'border-purple-200 bg-white hover:border-purple-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800'
                : 'border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Practice Exercises</span>
            <i className="fa-solid fa-dumbbell text-slate-400" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Strengthen retention with adaptive drills
          </p>
        </button>

        <button
          type="button"
          disabled={!canAccessStage('exam')}
          className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition ${
            isStageComplete('exam')
              ? 'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
              : canAccessStage('exam') && isLastLessonCompleted
                ? 'border-sky-200 bg-white hover:border-sky-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800'
                : 'border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Start Exam</span>
            <i className="fa-solid fa-clipboard-check text-slate-400" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Complete all lessons first to unlock the exam
          </p>
        </button>

        <button
          type="button"
          disabled={!canAccessStage('feedback')}
          className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition ${
            isStageComplete('feedback')
              ? 'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
              : canAccessStage('feedback')
                ? 'border-rose-200 bg-white hover:border-rose-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800'
                : 'border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Share Feedback</span>
            <i className="fa-solid fa-comments text-slate-400" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Provide insights to personalize future paths
          </p>
        </button>
      </div>
    </div>
  )
}

export default function LearnerLibrary() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadProgress()
  }, [])

  const loadProgress = async () => {
    setLoading(true)
    try {
      const learnerId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
      const progressData = await getLearnerProgress(learnerId)
      const enhancedCourses = progressData.map(course => ({
        id: course.course_id,
        title: course.title,
        level: course.level,
        rating: course.rating,
        progress: course.progress,
        status: course.status
      }))
      setCourses(enhancedCourses)
    } catch (err) {
      showToast('Failed to load your library', 'error')
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = courses.filter(course => {
    if (filter === 'all') return true
    if (filter === 'completed') return course.status === 'completed' || course.progress === 100
    if (filter === 'in_progress') return course.status === 'in_progress' || course.progress < 100
    return true
  })

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner message="Loading your learning library..." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header className="rounded-3xl bg-gradient-to-r from-emerald-100 via-teal-100 to-sky-100 p-8 shadow-lg ring-1 ring-emerald-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 dark:ring-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500 dark:text-emerald-300">
          My Library
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-800 md:text-4xl dark:text-slate-100">
          Continue where you left off
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base dark:text-slate-300">
          Access enrolled courses, monitor progress, and complete pending assessments to unlock certificates.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {['all', 'in_progress', 'completed'].map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filter === option
                  ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {option === 'all' ? 'All' : option === 'in_progress' ? 'In Progress' : 'Completed'}
            </button>
          ))}
        </div>
        <Link
          to="/learner/marketplace"
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300"
        >
          <i className="fa-solid fa-plus text-xs" />
          Enroll in new course
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center shadow-md dark:border-slate-700 dark:bg-slate-900/60">
          <i className="fa-solid fa-books text-4xl text-indigo-400" />
          <h2 className="mt-4 text-2xl font-semibold text-slate-800 dark:text-slate-100">
            No courses found for this filter
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Browse the marketplace to add new courses to your learning library.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filtered.map(course => (
            <LibraryCourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      <Toast />
    </div>
  )
}

