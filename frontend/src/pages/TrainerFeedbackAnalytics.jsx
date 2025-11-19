import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, MessageSquare, Star, TrendingUp, Users } from 'lucide-react'
import { getCourseById, getFeedback } from '../services/apiService.js'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Container from '../components/Container.jsx'
import { useApp } from '../context/AppContext'

export default function TrainerFeedbackAnalytics() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [course, setCourse] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      // Use aggregated feedback endpoint for trainers (GET /api/v1/feedback/:courseId)
      const [courseData, feedbackData] = await Promise.all([
        getCourseById(id),
        getFeedback(id).catch(() => null)
      ])
      setCourse(courseData)
      setFeedback(feedbackData)
    } catch (err) {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page-surface">
        <Container>
          <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-card)] p-10 shadow-sm backdrop-blur">
            <LoadingSpinner message="Loading feedback analytics..." />
          </div>
        </Container>
      </div>
    )
  }

  const analytics = feedback || {
    average_rating: 0,
    total_feedback: 0,
    rating_trend: [],
    tags_breakdown: {},
    versions: []
  }

  return (
    <div className="page-surface">
      <Container>
        <div className="flex flex-col gap-10 py-10">
          <header className="flex flex-col gap-6 rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-8 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                <MessageSquare className="h-4 w-4 text-[var(--primary-cyan)]" />
                Feedback analytics
              </span>
              <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
                Understand learner sentiment and take action
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Track ratings, identify trends, and see which course versions resonate with learners. Use these insights
                to prioritise updates and respond proactively.
              </p>
              {course && (
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Course: <span className="text-[var(--text-secondary)]">{course.title || course.course_name}</span>
                </p>
              )}
            </div>
            <Button variant="secondary" onClick={() => navigate('/trainer/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 text-center shadow-sm backdrop-blur">
              <span className="inline-flex items-center justify-center rounded-2xl bg-[rgba(250,204,21,0.18)] p-3 text-[#ca8a04]">
                <Star className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Average rating</p>
              <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
                {analytics.average_rating?.toFixed(1) || 'N/A'}
              </p>
            </div>
            <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 text-center shadow-sm backdrop-blur">
              <span className="inline-flex items-center justify-center rounded-2xl bg-[rgba(59,130,246,0.18)] p-3 text-[#1d4ed8]">
                <Users className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Total feedback</p>
              <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{analytics.total_feedback || 0}</p>
            </div>
            <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 text-center shadow-sm backdrop-blur">
              <span className="inline-flex items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.18)] p-3 text-[#047857]">
                <TrendingUp className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Rating trend</p>
              <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
                {analytics.rating_trend?.length || 0} checkpoints
              </p>
            </div>
            <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 text-center shadow-sm backdrop-blur">
              <span className="inline-flex items-center justify-center rounded-2xl bg-[rgba(99,102,241,0.18)] p-3 text-[#4338ca]">
                <MessageSquare className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Versions analysed</p>
              <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{analytics.versions?.length || 0}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur">
            <header className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Feedback by category</h2>
              <MessageSquare className="h-5 w-5 text-[var(--primary-cyan)]" />
            </header>
            {Object.keys(analytics.tags_breakdown || {}).length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No tagged feedback yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(analytics.tags_breakdown || {}).map(([tag, rating]) => (
                  <div
                    key={tag}
                    className="rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-secondary)]/40 p-4 text-center"
                  >
                    <strong className="text-sm text-[var(--text-primary)]">{tag}</strong>
                    <p className="mt-3 text-2xl font-bold text-[var(--primary-cyan)]">{rating.toFixed(1)}</p>
                    <span className="text-xs text-[var(--text-secondary)]">Avg. sentiment</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {analytics.rating_trend && analytics.rating_trend.length > 0 && (
            <section className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur">
              <header className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Rating trend</h2>
                <TrendingUp className="h-5 w-5 text-[var(--primary-cyan)]" />
              </header>
              <div className="space-y-3">
                {analytics.rating_trend.map((trend, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl bg-[var(--bg-secondary)]/40 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]"
                  >
                    <span>{new Date(trend.date).toLocaleDateString()}</span>
                    <span className="text-[var(--primary-cyan)]">{trend.avg_rating.toFixed(1)} ★</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {analytics.versions && analytics.versions.length > 0 && (
            <section className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur">
              <header className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Ratings by version</h2>
                <Users className="h-5 w-5 text-[var(--primary-cyan)]" />
              </header>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {analytics.versions.map((version, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-secondary)]/40 p-4 text-center"
                  >
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      Version {version.version_no}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[var(--primary-cyan)]">{version.avg_rating.toFixed(1)}</p>
                    <span className="text-xs text-[var(--text-secondary)]">Avg. rating</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </Container>
    </div>
  )
}

