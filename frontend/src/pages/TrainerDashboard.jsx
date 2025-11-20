import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getCourses, publishCourse } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext'
import Container from '../components/Container.jsx'
import {
  BarChart3,
  Layers,
  Users,
  Star,
  RefreshCw,
  PlusCircle,
  ArrowUpRight,
  CheckCircle2,
  Rocket,
  Sparkles
} from 'lucide-react'

const getAverageRating = (courses) => {
  if (!courses.length) return 0
  const total = courses.reduce((acc, course) => acc + Number(course.average_rating || course.rating || 0), 0)
  return total / courses.length
}

const getActiveLearners = (courses) =>
  courses.reduce((acc, course) => acc + Number(course.active_enrollments || course.total_enrollments || 0), 0)

export default function TrainerDashboard() {
  const { showToast, userProfile } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 50 })
      const allCourses = data.courses || []
      
      // Filter courses to show only the trainer's own courses
      // Match by created_by_user_id (temporary until JWT auth is implemented)
      const trainerId = userProfile?.id
      const trainerCourses = trainerId
        ? allCourses.filter((course) => course.created_by_user_id === trainerId || course.created_by === trainerId)
        : allCourses
      
      setCourses(trainerCourses)
    } catch (err) {
      showToast('Failed to load courses', 'error')
    } finally {
      setLoading(false)
    }
  }

  const onPublish = async (courseId) => {
    const confirm = window.confirm('Publish this course to the marketplace?')
    if (!confirm) return

    setPublishing(true)
    try {
      await publishCourse(courseId)
      showToast('Course published successfully!', 'success')
      loadCourses()
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to publish course'
      showToast(errorMsg, 'error')
    } finally {
      setPublishing(false)
    }
  }

  const metrics = useMemo(() => {
    const published = courses.filter((course) => (course.status || 'draft') === 'live')
    const drafts = courses.filter((course) => (course.status || 'draft') === 'draft')

    return [
      {
        label: 'Published courses',
        value: published.length,
        icon: Rocket,
        accent: 'bg-[rgba(16,185,129,0.14)] text-[#047857]'
      },
      {
        label: 'Drafts in progress',
        value: drafts.length,
        icon: Layers,
        accent: 'bg-[rgba(234,179,8,0.18)] text-[#b45309]'
      },
      {
        label: 'Active learners',
        value: getActiveLearners(published),
        icon: Users,
        accent: 'bg-[rgba(59,130,246,0.14)] text-[#1d4ed8]'
      },
      {
        label: 'Average rating',
        value: getAverageRating(published).toFixed(1),
        icon: Star,
        accent: 'bg-[rgba(250,204,21,0.18)] text-[#ca8a04]'
      }
    ]
  }, [courses])

  return (
    <div className="page-surface">
      <Container>
        <div className="flex flex-col gap-6 py-6">
          <header className="flex flex-col gap-6 rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-8 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                <Sparkles className="h-4 w-4 text-[var(--primary-cyan)]" />
                Trainer workspace
              </span>
              <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
                Manage and launch world-class learning experiences
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Review draft courses, publish updates, and keep tabs on learner engagement. Everything you need to steer
                your portfolio lives here.
            </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/trainer/courses" className="btn-trainer-primary inline-flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Manage courses
              </Link>
              <button type="button" className="btn-trainer-secondary inline-flex items-center gap-2" onClick={loadCourses}>
                <RefreshCw className="h-4 w-4" />
                Refresh data
              </button>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon, accent }) => (
              <article
                key={label}
                className="flex items-center justify-between rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
                  <p className="mt-3 text-3xl font-bold text-[var(--text-primary)]">{value}</p>
          </div>
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
                  <Icon className="h-6 w-6" />
                </span>
              </article>
            ))}
      </section>

          <section className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur">
            <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Portfolio overview</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {courses.length} course{courses.length === 1 ? '' : 's'} assigned to you
                </p>
            </div>
              <Link
                to="/trainer/feedback/overview"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-cyan)] hover:text-[var(--primary-blue)]"
              >
                View analytics
                <ArrowUpRight className="h-4 w-4" />
              </Link>
          </header>

          {loading ? (
              <div className="flex min-h-[320px] items-center justify-center">
              <LoadingSpinner message="Syncing courses..." />
            </div>
          ) : courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[rgba(148,163,184,0.35)] bg-[var(--bg-secondary)]/40 p-10 text-center text-[var(--text-muted)]">
                <Layers className="h-10 w-10 text-[var(--primary-cyan)]" />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">No assigned courses yet</h3>
                  <p className="text-sm">
                Your course workspace will appear here once content is provisioned for you.
              </p>
                </div>
            </div>
          ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => {
                  const courseId = course.id || course.course_id
                  const status = course.status || 'draft'
                  const isLive = status === 'live'

                  return (
                    <article
                      key={courseId}
                      className="flex flex-col gap-5 rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(99,102,241,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#4338ca]">
                            {course.level || 'Beginner'}
                          </span>
                          <h3 className="text-lg font-semibold leading-tight text-[var(--text-primary)]">
                            {course.title || course.course_name}
                          </h3>
                          <p className="text-sm leading-6 text-[var(--text-secondary)]">
                            {course.description || course.course_description || 'No description provided yet.'}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                            isLive
                              ? 'bg-[rgba(16,185,129,0.14)] text-[#047857]'
                              : 'bg-[rgba(234,179,8,0.18)] text-[#b45309]'
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {isLive ? 'Live' : 'Draft'}
                        </span>
                      </div>

                      <div className="grid gap-3 rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] sm:grid-cols-3">
                        <span className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-[var(--primary-cyan)]" />
                          {(course.modules || []).length} modules
                        </span>
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[var(--primary-cyan)]" />
                          {course.active_enrollments || course.total_enrollments || 0} learners
                    </span>
                        <span className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-[var(--primary-cyan)]" />
                          {(course.average_rating || 0).toFixed(1)} rating
                    </span>
                  </div>

                      <div className="flex flex-wrap gap-3">
                        {!isLive && (
                      <button
                        type="button"
                            onClick={() => onPublish(courseId)}
                        disabled={publishing}
                            className="btn-trainer-primary flex-1 min-w-[140px] items-center justify-center gap-2"
                      >
                            <Rocket className="h-4 w-4" />
                            Publish
                      </button>
                    )}
                        <Link
                          to={`/trainer/course/${courseId}`}
                          className="btn-trainer-secondary flex-1 min-w-[140px] items-center justify-center gap-2"
                        >
                          <Layers className="h-4 w-4" />
                          Structure
                    </Link>
                        {isLive && (
                          <Link
                            to={`/trainer/feedback/${courseId}`}
                            className="btn-trainer-secondary flex-1 min-w-[140px] items-center justify-center gap-2"
                          >
                            <BarChart3 className="h-4 w-4" />
                            Feedback
                      </Link>
                    )}
                  </div>
                </article>
                  )
                })}
            </div>
          )}
        </section>
        </div>
      </Container>
    </div>
  )
}
