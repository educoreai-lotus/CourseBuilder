import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function LearnerMarketplace() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async (filters = {}) => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 60, ...filters })
      setCourses(data.courses || [])
    } catch (err) {
      showToast('Failed to load marketplace courses', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    const filters = {}
    if (query) filters.search = query
    if (level !== 'all') filters.level = level
    loadCourses(filters)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-800 to-sky-700 p-8 shadow-xl text-white">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-sky-200">
              Marketplace
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">
              Explore expert-designed courses and learning paths
            </h1>
            <p className="text-sm text-slate-200 md:text-base">
              Filter by level, discover curated collections, and enroll to start building your personalised curriculum.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/15 px-6 py-4 text-sm font-semibold text-sky-100 shadow-lg backdrop-blur">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-sky-200">Active learners</span>
              <span className="text-2xl font-bold text-white">12,487</span>
            </div>
            <div className="h-12 w-px bg-white/20" />
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-sky-200">Courses</span>
              <span className="text-2xl font-bold text-white">280+</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          className="mt-6 grid gap-4 rounded-2xl bg-white/15 p-4 backdrop-blur md:grid-cols-[1.5fr_1fr_auto]"
        >
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by course, topic, trainer..."
              className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-200 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Apply filters
          </button>
        </form>
      </header>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner message="Discovering courses..." />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center shadow-md dark:border-slate-700 dark:bg-slate-900/60">
          <i className="fa-solid fa-magnifying-glass text-4xl text-indigo-400" />
          <h2 className="mt-4 text-2xl font-semibold text-slate-800 dark:text-slate-100">
            No courses match your filters
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Try adjusting the level or keywords to explore more learning options.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {courses.map(course => {
            const tags = Array.isArray(course.tags) ? course.tags : []
            const displayTags = tags.length > 0 ? tags.slice(0, 2) : ['Skill builder', 'Project-based']
            return (
              <div
              key={course.id || course.course_id}
              className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-800/60"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">
                    {course.level || 'beginner'}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-slate-800 dark:text-slate-100">
                    {course.title || course.course_name}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-300">
                    {course.description || course.course_description || 'Accelerate your learning with actionable insights and guided projects.'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                    <i className="fa-solid fa-star text-xs" />
                    {(course.rating || course.average_rating || 4.6).toFixed(1)}
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {course.total_enrollments ? `${course.total_enrollments}+ learners` : 'Popular choice'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-indigo-400" />
                  {course.modules?.length || 4} modules
                </span>
                <span className="inline-flex items-center gap-2">
                  <i className="fa-solid fa-clock text-emerald-400" />
                  {course.duration ? `${course.duration} mins` : '45 mins / lesson'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <i className="fa-solid fa-tag text-rose-400" />
                  {displayTags.join(' · ')}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                  <i className="fa-solid fa-chart-line text-indigo-400" />
                  {course.visibility === 'private' ? 'Invite only' : 'Open enrollment'}
                </div>
                <Link
                  to={`/courses/${course.id || course.course_id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
                >
                  View details <i className="fa-solid fa-arrow-right text-xs" />
                </Link>
              </div>
            </div>
            )
          })}
        </div>
      )}

      <Toast />
    </div>
  )
}

