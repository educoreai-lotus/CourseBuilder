import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function TrainerCourses() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 50 })
      setCourses(data.courses || [])
    } catch (err) {
      showToast('Failed to load trainer courses', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter(course => {
    if (statusFilter === 'all') return true
    return (course.status || 'draft') === statusFilter
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-8 shadow-xl text-white">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-200">Trainer Mode</p>
            <h1 className="text-3xl font-bold md:text-4xl">Manage course lifecycle</h1>
            <p className="text-sm text-slate-200 md:text-base">
              Draft, refine, and publish courses across versions. Track feedback and keep content evergreen with quick actions.
            </p>
          </div>
          <Link
            to="/trainer/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <i className="fa-solid fa-plus text-xs" />
            Create new course
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['all', 'draft', 'live', 'archived'].map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-lg hover:bg-slate-800'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={loadCourses}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <i className="fa-solid fa-rotate-right text-xs" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner message="Loading trainer workspace..." />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center shadow-md dark:border-slate-700 dark:bg-slate-900/60">
          <i className="fa-solid fa-chalkboard text-4xl text-indigo-400" />
          <h2 className="mt-4 text-2xl font-semibold text-slate-800 dark:text-slate-100">
            No courses for this status
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Create a new course or adjust the filter to view existing content.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredCourses.map(course => (
            <div
              key={course.id || course.course_id}
              className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-800/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                    {course.category || 'General'}
                  </span>
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                    {course.title || course.course_name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-300 line-clamp-3">
                    {course.description || course.course_description || 'Keep this course updated with the latest insights and best practices.'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    (course.status || 'draft') === 'live'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : (course.status || 'draft') === 'archived'
                        ? 'bg-slate-400/10 text-slate-500'
                        : 'bg-amber-400/10 text-amber-600'
                  }`}>
                    <i className="fa-solid fa-circle text-[8px]" />
                    {course.status || 'draft'}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Last updated {course.updated_at ? new Date(course.updated_at).toLocaleDateString() : 'recently'}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {course.total_enrollments || 0} active learners
                  </span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Link
                  to={`/trainer/course/${course.id || course.course_id}`}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800"
                >
                  <span>Edit content & versions</span>
                  <i className="fa-solid fa-pen-to-square text-slate-400 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  to={`/trainer/publish/${course.id || course.course_id}`}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                >
                  <span>Schedule publishing</span>
                  <i className="fa-solid fa-calendar text-slate-400 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  to={`/trainer/feedback/${course.id || course.course_id}`}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800"
                >
                  <span>Feedback analytics</span>
                  <i className="fa-solid fa-chart-line text-slate-400 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast />
    </div>
  )
}

