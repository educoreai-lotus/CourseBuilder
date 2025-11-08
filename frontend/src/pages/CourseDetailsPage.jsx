import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourseById, registerLearner } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import CourseTreeView from '../components/CourseTreeView.jsx'
import { useApp } from '../context/AppContext'

export default function CourseDetailsPage() {
  const { id } = useParams()
  const { showToast, userRole } = useApp()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)
  const [error, setError] = useState(null)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    loadCourse()
  }, [id])

  const loadCourse = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCourseById(id)
      setCourse(data)
    } catch (err) {
      setError(err.message || 'Failed to load course')
      showToast('Failed to load course', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (enrolled) {
      showToast('You are already enrolled in this course', 'info')
      return
    }

    setRegistering(true)
    try {
      await registerLearner(id, {
        learner_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
      })
      setEnrolled(true)
      showToast('Successfully enrolled in course!', 'success')
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Registration failed'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setRegistering(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!course || error) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center rounded-3xl bg-white/80 p-12 text-center shadow-lg dark:bg-slate-900/60">
        <i className="fa-solid fa-triangle-exclamation text-4xl text-rose-500" />
        <h2 className="mt-4 text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {error || 'Course not found'}
        </h2>
        <Link
          to="/learner/marketplace"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700"
        >
          Browse Courses
        </Link>
      </div>
    )
  }

  const courseTitle = course.title || course.course_name
  const courseDescription = course.description || course.course_description
  const topics = Array.isArray(course.topics) ? course.topics : []
  const modules = topics.length > 0
    ? topics.flatMap(topic =>
        (topic.modules || []).map(module => ({
          ...module,
          topic_title: topic.title || topic.topic_title
        }))
      )
    : course.modules || []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 p-10 shadow-lg ring-1 ring-indigo-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 dark:ring-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-300">
                {course.level || 'beginner'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                <i className="fa-solid fa-star text-xs" />
                {(course.rating || course.average_rating || 4.6).toFixed(1)}
              </span>
              {course.duration && (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  <i className="fa-solid fa-clock text-indigo-400" />
                  {course.duration} minutes
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-slate-800 md:text-4xl dark:text-slate-100">{courseTitle}</h1>
            <p className="text-base text-slate-600 md:text-lg dark:text-slate-300">{courseDescription}</p>
            {course.trainer_name && (
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-slate-500 shadow dark:bg-slate-900/60 dark:text-slate-300">
                <i className="fa-solid fa-chalkboard-user text-indigo-500" />
                Instructor: <span className="text-slate-700 dark:text-slate-100">{course.trainer_name}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl bg-white/80 px-6 py-5 text-sm font-semibold text-slate-600 shadow-lg dark:bg-slate-900/70 dark:text-slate-200">
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">Enrollments</span>
              <div className="text-3xl font-bold text-indigo-500 dark:text-indigo-300">
                {course.total_enrollments || 0}
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">Completion</span>
              <div className="text-3xl font-bold text-emerald-500 dark:text-emerald-300">
                {course.completion_rate || 0}%
              </div>
            </div>
            {course.status && (
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                course.status === 'live'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                  : 'bg-slate-400/10 text-slate-500'
              }`}>
                <i className="fa-solid fa-circle text-[8px]" />
                {course.status}
              </span>
            )}
          </div>
        </div>

        {userRole === 'learner' && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!enrolled ? (
              <button
                type="button"
                onClick={handleRegister}
                disabled={registering}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {registering ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    Registering…
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-plus" />
                    Enroll in course
                  </>
                )}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                <i className="fa-solid fa-circle-check" />
                Enrolled
              </span>
            )}

            <Link
              to={`/course/${id}/feedback`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <i className="fa-solid fa-comment" />
              Leave feedback
            </Link>

            {enrolled && (
              <Link
                to={`/course/${id}/assessment`}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300"
              >
                <i className="fa-solid fa-clipboard-check" />
                Take assessment
              </Link>
            )}
          </div>
        )}
      </header>

      <section className="rounded-3xl bg-white/90 p-8 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-800">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400 dark:text-indigo-300">
              Course Structure
            </p>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
              Topic → Modules → Lessons
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Navigate from high-level themes down to specific lessons.
            </p>
          </div>
        </header>

        {topics.length > 0 ? (
          <div className="mt-6 space-y-6">
            {topics.map((topic, idx) => (
              <div key={topic.id || `topic-${idx}`} className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/60">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Topic {idx + 1}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {topic.title || topic.topic_title || `Topic ${idx + 1}`}
                    </h3>
                    {topic.summary && (
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                        {topic.summary}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                    {(topic.modules || []).length} modules
                  </span>
                </div>
                <div className="mt-4">
                  <CourseTreeView modules={topic.modules || []} courseId={id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <CourseTreeView modules={modules} courseId={id} />
          </div>
        )}
      </section>

      <Toast />
    </div>
  )
}

