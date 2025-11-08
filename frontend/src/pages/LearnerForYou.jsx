import { useEffect, useState } from 'react'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useCourseProgress } from '../hooks/useCourseProgress.js'

const defaultCourseState = {
  completedStages: [],
  completedLessons: 0
}

function PersonalizedCourseCard({ course, state, onCompleteStage, notify }) {
  const courseId = course.id || course.course_id
  const modules = course.modules || []
  const totalLessons = modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0) || 6

  const { canAccessStage, isStageComplete, isLastLessonCompleted } = useCourseProgress({
    courseType: 'personalized',
    completedStages: state.completedStages,
    totalLessons,
    completedLessons: state.completedLessons
  })

  const handleClick = (stage) => () => {
    onCompleteStage(courseId, stage, totalLessons)
    notify(`Marked ${stage} as complete.`, 'success')
  }
  const completeClass =
    'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
  const disabledClass =
    'border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500'
  const lessonReadyClass =
    'border-indigo-200 bg-white hover:border-indigo-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800'
  const exerciseReadyClass =
    'border-purple-200 bg-white hover:border-purple-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800'
  const examReadyClass =
    'border-sky-200 bg-white hover:border-sky-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800'
  const feedbackReadyClass =
    'border-rose-200 bg-white hover:border-rose-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800'

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-800/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">
            Personalized
          </span>
          <h3 className="mt-3 text-xl font-semibold text-slate-800 dark:text-slate-100">
            {course.title || course.course_name}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            {course.description || course.course_description || 'AI generated pathway based on your goals.'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            <i className="fa-solid fa-layer-group text-xs" />
            {modules.length || 3} modules
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
            <i className="fa-solid fa-book text-xs text-indigo-400" />
            {totalLessons} lessons
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={handleClick('lessons')}
          disabled={!canAccessStage('lessons') || isStageComplete('lessons')}
          className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition ${
            isStageComplete('lessons') ? completeClass : canAccessStage('lessons') ? lessonReadyClass : disabledClass
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Take Lesson</span>
            <i className="fa-solid fa-play text-slate-400" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Complete guided lessons tailored for you</p>
        </button>

        <button
          type="button"
          onClick={handleClick('exercises')}
          disabled={!canAccessStage('exercises') || isStageComplete('exercises')}
          className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition ${
            isStageComplete('exercises') ? completeClass : canAccessStage('exercises') ? exerciseReadyClass : disabledClass
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Do Exercise</span>
            <i className="fa-solid fa-dumbbell text-slate-400" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Practice skills with adaptive assessments</p>
        </button>

        <button
          type="button"
          onClick={handleClick('exam')}
          disabled={!canAccessStage('exam') || isStageComplete('exam')}
          className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition ${
            isStageComplete('exam')
              ? completeClass
              : isLastLessonCompleted && canAccessStage('exam')
                ? examReadyClass
                : disabledClass
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Exam</span>
            <i className="fa-solid fa-clipboard-check text-slate-400" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Unlock after finishing lessons and exercises
          </p>
        </button>

        <button
          type="button"
          onClick={handleClick('feedback')}
          disabled={!canAccessStage('feedback') || isStageComplete('feedback')}
          className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition ${
            isStageComplete('feedback') ? completeClass : canAccessStage('feedback') ? feedbackReadyClass : disabledClass
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Feedback</span>
            <i className="fa-solid fa-comments text-slate-400" />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Share reflections to improve future recommendations
          </p>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50/70 px-4 py-3 text-xs font-semibold text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
        <span className="inline-flex items-center gap-2">
          <i className="fa-solid fa-seedling text-emerald-500" /> Adaptive difficulty enabled
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="fa-solid fa-robot text-indigo-500" /> AI trainer synced
        </span>
      </div>
    </div>
  )
}

export default function LearnerForYou() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [courseState, setCourseState] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 24 })
      const personalized = (data.courses || []).filter((_, idx) => idx % 2 === 0)
      setCourses(personalized)
    } catch (err) {
      showToast('Failed to load personalized recommendations', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getCourseState = (courseId) => courseState[courseId] || defaultCourseState

  const updateCourseState = (courseId, updater) => {
    setCourseState(prev => {
      const current = prev[courseId] || defaultCourseState
      const nextState = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      return {
        ...prev,
        [courseId]: nextState
      }
    })
  }

  const handleStageCompletion = (courseId, stage, totalLessons) => {
    updateCourseState(courseId, (current) => {
      const completedStages = new Set(current.completedStages)
      completedStages.add(stage)
      return {
        ...current,
        completedStages: Array.from(completedStages),
        completedLessons: stage === 'lessons' ? totalLessons : current.completedLessons
      }
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner message="Loading AI recommendations..." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header className="rounded-3xl bg-gradient-to-r from-purple-100 via-indigo-100 to-sky-100 p-8 shadow-lg ring-1 ring-purple-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 dark:ring-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-500 dark:text-purple-300">
          Personalized Journey
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-800 md:text-4xl dark:text-slate-100">
          Courses curated just for you
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base dark:text-slate-300">
          These learning paths adapt to your progress. Complete lessons, unlock exercises, then take the exam before sharing feedback for deeper insights.
        </p>
      </header>

      {courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center shadow-md dark:border-slate-700 dark:bg-slate-900/60">
          <i className="fa-solid fa-sparkles text-4xl text-indigo-400" />
          <h2 className="mt-4 text-2xl font-semibold text-slate-800 dark:text-slate-100">
            No personalized courses yet
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Interact with marketplace courses and complete feedback to unlock tailored recommendations.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {courses.map((course) => renderCourseCard(course))}
        </div>
      )}

      <Toast />
    </div>
  )
}

