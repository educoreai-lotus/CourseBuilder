import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { CalendarRange, Layers, ListOrdered, Rocket } from 'lucide-react'
import { getCourseById, publishCourse, scheduleCourse } from '../services/apiService.js'
import PublishControls from '../components/PublishControls.jsx'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Container from '../components/Container.jsx'
import { useApp } from '../context/AppContext'

export default function TrainerPublish() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    loadCourse()
  }, [id])

  const loadCourse = async () => {
    setLoading(true)
    try {
      const data = await getCourseById(id)
      setCourse(data)
    } catch (err) {
      showToast('Failed to load course', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await publishCourse(id)
      showToast('Course published successfully!', 'success')
      navigate('/trainer/dashboard')
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to publish course'
      showToast(message, 'error')
    } finally {
      setPublishing(false)
    }
  }

  const handleSchedule = async ({ scheduled_at }) => {
    setPublishing(true)
    try {
      await scheduleCourse(id, { publish_at: scheduled_at })
      showToast(`Course scheduled for ${new Date(scheduled_at).toLocaleString()}`, 'success')
      navigate('/trainer/dashboard')
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to schedule course'
      showToast(message, 'error')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="page-surface">
        <Container>
          <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-card)] p-10 shadow-sm backdrop-blur">
            <LoadingSpinner message="Loading course..." />
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="page-surface">
      <Container>
        <div className="mx-auto flex max-w-4xl flex-col gap-10 py-10">
          <header className="flex flex-col gap-6 rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-8 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  <Rocket className="h-4 w-4 text-[var(--primary-cyan)]" />
                  Publishing control
                </span>
                <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">Launch your course</h1>
                <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                  Confirm the course metadata, choose a launch window, and publish instantly or schedule a future release.
                </p>
              </div>
              <Button variant="secondary" onClick={() => navigate(`/trainer/course/${id}`)}>
                Back to validation
              </Button>
            </div>
            {course && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-sm font-semibold text-[var(--text-secondary)]">
                  <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Course</span>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {course.title || course.course_name}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-sm font-semibold text-[var(--text-secondary)]">
                  <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Difficulty</span>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {(course.level || 'Beginner').toString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-sm font-semibold text-[var(--text-secondary)]">
                  <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Status</span>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)] capitalize">
                    {course.status || 'draft'}
                  </p>
                </div>
              </div>
            )}
          </header>

          {course && (
            <section className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur">
              <header className="mb-5 flex items-center gap-3">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Snapshot</h2>
                <Layers className="h-5 w-5 text-[var(--primary-cyan)]" />
              </header>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-sm font-semibold text-[var(--text-secondary)]">
                  <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Modules</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {(course.modules || []).length}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-sm font-semibold text-[var(--text-secondary)]">
                  <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Lessons</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                    {(course.modules || []).reduce((total, module) => total + (module.lessons?.length || 0), 0)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-sm font-semibold text-[var(--text-secondary)]">
                  <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Next step</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                    Choose immediate publish or schedule a launch
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur">
            <header className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Publishing controls</h2>
              <CalendarRange className="h-5 w-5 text-[var(--primary-cyan)]" />
            </header>
            <PublishControls
              courseId={id}
              onPublish={handlePublish}
              onSchedule={handleSchedule}
              loading={publishing}
            />
          </section>

          <div className="rounded-3xl border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.1)] p-4 text-sm text-[#047857]">
            <ListOrdered className="mr-3 inline h-4 w-4" />
            Once published, the course appears in the internal marketplace and learners can enrol immediately.
          </div>
        </div>
      </Container>
    </div>
  )
}

