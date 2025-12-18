import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Target,
  AlertTriangle,
  Sparkles,
  Loader2
} from 'lucide-react'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { getCourseById } from '../services/apiService.js'
import { useApp } from '../context/AppContext'
import { useAssessmentLauncher } from '../hooks/useAssessmentLauncher.js'
import Container from '../components/Container.jsx'

export default function AssessmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast, userProfile } = useApp()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const { launchAssessment, launching } = useAssessmentLauncher()

  useEffect(() => {
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

    loadCourse()
  }, [id, showToast])

  // Auto-launch assessment when this page is accessed directly (legacy entry point)
  // This keeps behavior consistent while removing the need for a second user click.
  useEffect(() => {
    if (!loading && course && userProfile?.id) {
      launchAssessment(id)
    }
  }, [loading, course, userProfile?.id, id, launchAssessment])

  if (loading) {
    return (
      <div className="page-surface bg-[var(--bg-primary)] transition-colors">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Loading assessment..." />
          </div>
        </Container>
      </div>
    )
  }

  const courseTitle = course?.title || course?.course_name || 'Course assessment'

  return (
    <div className="page-surface bg-[var(--bg-primary)] transition-colors">
      <Container>
        <div className="mx-auto flex max-w-4xl flex-col gap-10 py-10">
            <div className="flex items-center justify-between gap-4">
            <Button variant="secondary" onClick={() => navigate(`/course/${id}/overview`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to overview
            </Button>
            <div className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Assessment · Feedback
            </div>
          </div>

          <section className="microservice-card refined space-y-6" style={{ textAlign: 'left' }}>
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="rounded-3xl bg-[var(--gradient-secondary)] p-4 text-white shadow-lg">
                <ClipboardCheck className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
                  Final assessment
                </h1>
                <p className="text-base leading-7 text-[var(--text-secondary)]">
                  Demonstrate mastery of <strong>{courseTitle}</strong> through scenario-based questions and practical evaluation.
                  Passing this assessment unlocks your completion certificate and tailored feedback report.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[var(--bg-card)]/90 p-4 text-sm shadow-sm backdrop-blur transition-colors">
                <div className="flex items-center gap-2 text-[var(--primary-cyan)]">
                  <CheckCircle2 size={16} />
                  <span className="font-semibold text-[var(--text-primary)]">Passing score</span>
                </div>
                <p className="mt-2 font-semibold text-[var(--text-secondary)]">70% or higher</p>
              </div>
              <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[var(--bg-card)]/90 p-4 text-sm shadow-sm backdrop-blur transition-colors">
                <div className="flex items-center gap-2 text-[var(--primary-cyan)]">
                  <Clock size={16} />
                  <span className="font-semibold text-[var(--text-primary)]">Time limit</span>
                </div>
                <p className="mt-2 font-semibold text-[var(--text-secondary)]">60 minutes</p>
              </div>
              <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[var(--bg-card)]/90 p-4 text-sm shadow-sm backdrop-blur transition-colors">
                <div className="flex items-center gap-2 text-[var(--primary-cyan)]">
                  <Sparkles size={16} />
                  <span className="font-semibold text-[var(--text-primary)]">Attempts</span>
                </div>
                <p className="mt-2 font-semibold text-[var(--text-secondary)]">1 attempt</p>
              </div>
            </div>

            <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/90 p-6 shadow-sm backdrop-blur transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-cyan)]" />
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Launching assessment…</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    You&apos;ll be redirected to the assessment in a moment.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </Container>
    </div>
  )
}

