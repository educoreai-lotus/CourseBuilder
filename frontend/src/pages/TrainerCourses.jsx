import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArrowLeft, BarChart3, Layers, Pencil, Rocket, Trash2, Users, Sparkles } from 'lucide-react'
import { getCourses, updateCourse, publishCourse } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext.jsx'
import Container from '../components/Container.jsx'

const STATUS_FILTERS = ['all', 'draft', 'live', 'archived']

export default function TrainerCourses() {
  const { showToast, userProfile } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 100 })
      const allCourses = data.courses || []
      
      // Filter courses to show only the trainer's own courses
      // Match by created_by_user_id (temporary until JWT auth is implemented)
      const trainerId = userProfile?.id
      const trainerCourses = trainerId
        ? allCourses.filter((course) => course.created_by_user_id === trainerId || course.created_by === trainerId)
        : allCourses
      
      setCourses(trainerCourses)
    } catch (err) {
      showToast('Failed to load trainer courses', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = useMemo(() => {
    let result = courses
    if (statusFilter !== 'all') {
      result = result.filter((course) => (course.status || 'draft') === statusFilter)
    }
    return result
  }, [courses, statusFilter])

  const handleArchiveCourse = async (courseId) => {
    const confirm = window.confirm('Archive this course? Learners will no longer see it in the marketplace.')
    if (!confirm) return

    setProcessingId(courseId)
    try {
      await updateCourse(courseId, { status: 'archived' })
      showToast('Course archived successfully', 'success')
      loadCourses()
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to archive course'
      showToast(message, 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handlePublishCourse = async (courseId) => {
    const confirm = window.confirm('Publish this course now?')
    if (!confirm) return

    setProcessingId(courseId)
    try {
      await publishCourse(courseId)
      showToast('Course published successfully', 'success')
      loadCourses()
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to publish course'
      showToast(message, 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const badgeStyles = (status) => {
    switch (status) {
      case 'live':
        return 'bg-[rgba(16,185,129,0.16)] text-[#047857]'
      case 'archived':
        return 'bg-[rgba(148,163,184,0.18)] text-[var(--text-muted)]'
      default:
        return 'bg-[rgba(234,179,8,0.18)] text-[#b45309]'
    }
  }

  return (
    <div className="page-surface">
      <Container>
        <div className="flex flex-col gap-6 py-6">
          <header className="flex flex-col gap-6 rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-8 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                <ArrowLeft className="h-4 w-4 text-[var(--primary-cyan)]" />
                Lifecycle management
              </span>
              <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
                Curate, iterate, and launch your course catalogue
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                Filter by status, update course content, and coordinate publishing with confidence. Archived courses stay
                available for auditing while being hidden from learners.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/trainer/dashboard" className="btn-trainer-secondary inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
              <button type="button" className="btn-trainer-primary" onClick={loadCourses}>
                Refresh courses
              </button>
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-card)] p-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    statusFilter === status
                      ? 'bg-[var(--primary-cyan)] text-white shadow-sm'
                      : 'border border-[rgba(148,163,184,0.35)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--primary-cyan)]'
                  }`}
                >
                  <span className="capitalize">{status}</span>
                  {status === 'all' && (
                    <small className="ml-2 text-[var(--text-muted)]">{courses.length} total</small>
                  )}
                </button>
              ))}
            </div>
            <span className="text-sm text-[var(--text-secondary)]">
              {filteredCourses.length} course{filteredCourses.length === 1 ? '' : 's'} shown
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-card)] p-10 shadow-sm backdrop-blur">
              <LoadingSpinner message="Loading trainer workspace..." />
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-[rgba(148,163,184,0.35)] bg-[var(--bg-secondary)]/40 p-12 text-center">
              <Archive className="h-10 w-10 text-[var(--primary-cyan)]" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">No courses for this filter</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Adjust the filters or reach out to the curriculum team to provision additional content.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course) => {
                const courseId = course.id || course.course_id
                const status = course.status || 'draft'
                const disabled = processingId === courseId

                return (
                  <article
                    key={courseId}
                    className="flex flex-col gap-5 rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(148,163,184,0.16)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                            {course.category || 'General'}
                          </span>
                          {course.ai_assets && Object.keys(course.ai_assets).length > 0 && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(168,85,247,0.12)] px-3 py-1 text-xs font-semibold text-[#7c3aed]">
                              <Sparkles className="h-3 w-3" />
                              AI Enriched
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                          {course.title || course.course_name}
                        </h2>
                        <p className="text-sm leading-6 text-[var(--text-secondary)]">
                          {course.description ||
                            course.course_description ||
                            'Keep this course updated with the latest insights and best practices.'}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest shrink-0 ${badgeStyles(status)}`}>
                        <Layers className="h-3 w-3" />
                        {status}
                      </span>
                    </div>

                    <div className="grid gap-3 rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] sm:grid-cols-3">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[var(--primary-cyan)]" />
                        {course.active_enrollments || course.total_enrollments || 0} learners
                      </span>
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-[var(--primary-cyan)]" />
                        {(course.average_rating || 0).toFixed(1)} rating
                      </span>
                      <span className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-[var(--primary-cyan)]" />
                        {(course.modules || []).length} modules
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/trainer/course/${courseId}`}
                        className="btn-trainer-secondary flex-1 min-w-[140px] items-center justify-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit course
                      </Link>
                      <Link
                        to={`/trainer/publish/${courseId}`}
                        className="btn-trainer-primary flex-1 min-w-[140px] items-center justify-center gap-2"
                      >
                        <Rocket className="h-4 w-4" />
                        Publish
                      </Link>
                      <Link
                        to={`/trainer/feedback/${courseId}`}
                        className="btn-trainer-secondary flex-1 min-w-[140px] items-center justify-center gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                      </Link>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          status === 'archived' ? handlePublishCourse(courseId) : handleArchiveCourse(courseId)
                        }
                        className={`flex-1 min-w-[140px] items-center justify-center gap-2 ${
                          status === 'archived' ? 'btn-trainer-primary' : 'btn-trainer-secondary'
                        }`}
                      >
                        {status === 'archived' ? (
                          <>
                            <Rocket className="h-4 w-4" />
                            Restore
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Archive
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
