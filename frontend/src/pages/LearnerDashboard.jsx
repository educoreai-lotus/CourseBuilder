import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext'

const quickActions = [
  {
    title: 'Marketplace',
    description: 'Discover hundreds of curated courses across topics.',
    icon: 'fa-solid fa-store',
    to: '/learner/marketplace',
    accent: 'from-emerald-400 to-teal-400'
  },
  {
    title: 'For You',
    description: 'AI-personalized recommendations based on your goals.',
    icon: 'fa-solid fa-wand-magic-sparkles',
    to: '/learner/for-you',
    accent: 'from-indigo-400 to-sky-400'
  },
  {
    title: 'My Library',
    description: 'Resume learning and track course progress.',
    icon: 'fa-solid fa-book-open-reader',
    to: '/learner/library',
    accent: 'from-rose-400 to-orange-400'
  }
]

export default function LearnerDashboard() {
  const { showToast } = useApp()
  const [recommended, setRecommended] = useState([])
  const [continueLearning, setContinueLearning] = useState([])
  const [trendingTopics, setTrendingTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 24 })
      const courses = data.courses || []

      setRecommended(courses.slice(0, 6))
      setContinueLearning(
        courses.slice(6, 12).map((course, idx) => ({
          ...course,
          progress: 20 + (idx * 15) % 70,
          lastTouched: `${2 + idx} days ago`
        }))
      )
      setTrendingTopics(
        courses.slice(12, 18).map((course, idx) => ({
          topic: course.category || `Topic ${idx + 1}`,
          learners: 320 + idx * 57,
          momentum: idx % 2 === 0 ? 'up' : 'steady'
        }))
      )
    } catch (err) {
      showToast('Failed to load your learner dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  const emptyState = useMemo(() => recommended.length === 0 && continueLearning.length === 0, [recommended, continueLearning])

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <LoadingSpinner message="Loading your learning hub..." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 p-8 shadow-lg ring-1 ring-indigo-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 dark:ring-slate-800">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">Learner Mode</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-800 md:text-4xl dark:text-slate-100">
          Welcome back! Let&apos;s continue your learning journey.
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-600 md:text-lg dark:text-slate-300">
          Jump into personalized lessons, explore new topics, and track your progress across AI-powered learning paths.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.to}
              className="group rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-800/70"
            >
              <div className={`inline-flex rounded-xl bg-gradient-to-r ${action.accent} p-3 text-white shadow-md`}>
                <i className={`${action.icon} text-lg`} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">{action.title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{action.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition group-hover:gap-3 dark:text-indigo-300">
                Explore <i className="fa-solid fa-arrow-right text-xs" />
              </span>
            </Link>
          ))}
        </div>
      </header>

      {emptyState ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-12 text-center shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/60">
          <i className="fa-solid fa-compass text-4xl text-indigo-400" />
          <h2 className="mt-4 text-2xl font-semibold text-slate-800 dark:text-slate-100">Ready to start exploring?</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Build your learner profile by visiting the marketplace and saving courses to your library.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/learner/marketplace"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
            >
              Browse Marketplace
            </Link>
            <Link
              to="/learner/for-you"
              className="rounded-xl border border-indigo-200 px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
            >
              Get Recommendations
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="space-y-6 rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur-md ring-1 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-800">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Recommended for you</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Curated from your interests and recent activity.
                </p>
              </div>
              <Link
                to="/learner/for-you"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-800/80"
              >
                View personalized hub <i className="fa-solid fa-chevron-right text-xs" />
              </Link>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
              {recommended.slice(0, 4).map((course) => (
                <Link
                  key={course.id || course.course_id}
                  to={`/courses/${course.id || course.course_id}`}
                  className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-800/70"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">
                        {course.level || 'Beginner'}
                      </span>
                      <h3 className="mt-3 text-lg font-semibold text-slate-800 group-hover:text-indigo-600 dark:text-slate-100">
                        {course.title || course.course_name}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-300">
                        {course.description || course.course_description || 'Build practical skills with guided lessons and projects.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                      <i className="fa-solid fa-star text-xs" />
                      {(course.rating || course.average_rating || 4.6).toFixed(1)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-clock text-sm text-indigo-500" />
                      {course.duration ? `${course.duration} min` : '45 min avg / lesson'}
                    </span>
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-layer-group text-sm text-emerald-500" />
                      {course.modules?.length || 4} modules
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-7 space-y-6 rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur-md ring-1 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-800">
              <header className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Continue learning</h2>
                <Link
                  to="/learner/library"
                  className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  View all
                </Link>
              </header>

              <div className="space-y-4">
                {continueLearning.slice(0, 4).map((course) => (
                  <div
                    key={course.id || course.course_id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-800/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                          {course.title || course.course_name}
                        </h3>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          Last opened {course.lastTouched}
                        </p>
                      </div>
                      <Link
                        to={`/courses/${course.id || course.course_id}`}
                        className="rounded-xl bg-indigo-600/90 px-3 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-700"
                      >
                        Resume
                      </Link>
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500">
                      <span>{course.progress}% completed</span>
                      <span>{course.modules?.[0]?.lessons?.length || 8} lessons</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="md:col-span-5 space-y-6 rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur-md ring-1 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-800">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Trending topics</h2>
              <div className="space-y-4">
                {trendingTopics.map((topic) => (
                  <div
                    key={topic.topic}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">{topic.topic}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-400">
                        {topic.learners.toLocaleString()} learners this week
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                        topic.momentum === 'up'
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300'
                      }`}
                    >
                      <i className={`fa-solid ${topic.momentum === 'up' ? 'fa-arrow-trend-up' : 'fa-arrow-right'}`} />
                      {topic.momentum === 'up' ? 'Growing' : 'Steady'}
                    </span>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        </>
      )}

      <Toast />
    </div>
  )
}

