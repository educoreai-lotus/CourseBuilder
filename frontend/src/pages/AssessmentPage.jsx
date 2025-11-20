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
import Container from '../components/Container.jsx'

export default function AssessmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)

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

  const handleStartAssessment = () => {
    setRedirecting(true)
    showToast('Assessment launching... good luck!', 'success')
    setTimeout(() => {
      showToast('Great job! Share your feedback with the course team.', 'success')
      navigate(`/course/${id}/feedback`)
    }, 2000)
  }

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
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Assessment checklist</h2>
              <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#047857]" />
                  Covers all course modules and key learning objectives
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#047857]" />
                  Mix of scenario-based multiple choice and short-form responses
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#047857]" />
                  Adaptive scoring aligned with capability framework
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#047857]" />
                  Results shared with Analytics & Credentialing services
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] p-6 text-sm text-[#b45309] shadow-sm">
              <div className="mb-3 flex items-center gap-2 font-semibold uppercase tracking-widest text-[#b45309]">
                <AlertTriangle size={16} />
                Important notes
              </div>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li>Ensure all lessons are completed before starting the exam.</li>
                <li>You have a single attempt — plan your time carefully.</li>
                <li>Keep a stable internet connection to avoid interruptions.</li>
                <li>Passing the assessment issues your digital credential automatically.</li>
              </ul>
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button variant="primary" size="lg" onClick={handleStartAssessment} disabled={redirecting}>
                {redirecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    Launch assessment
                    <Target className="ml-3 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/course/${id}/overview`)} disabled={redirecting}>
                Review overview
              </Button>
            </div>

            <p className="text-center text-xs text-[var(--text-muted)]">
              Once finished, you&apos;ll move straight into the feedback experience to reflect on your learning journey.
            </p>
          </section>
        </div>
      </Container>
    </div>
  )
}

