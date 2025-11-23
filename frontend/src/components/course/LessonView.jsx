import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Clock,
  PlayCircle,
  CheckCircle2,
  Target,
  Sparkles,
  GraduationCap,
  Lock
} from 'lucide-react'
import LessonViewer from '../LessonViewer.jsx'
import Container from '../Container.jsx'
import LessonAssetsPanel from './LessonAssetsPanel.jsx'
import EnrichmentButton from '../../features/enrichment/components/EnrichmentButton.jsx'
import { isPersonalized, isMarketplace } from '../../utils/courseTypeUtils.js'

export default function LessonView({
  courseTitle,
  lesson,
  onPrevious,
  onNext,
  onComplete,
  isCompleted,
  completionSummary,
  onTakeTest,
  isFinalLesson = false,
  structureHref,
  overviewHref,
  enrichmentAssets,
  enrichmentLoading = false,
  enrichmentError = null,
  enrichmentAsset = null,
  onEnrichmentResults = null,
  onEnrichmentLoading = null,
  onEnrichmentError = null,
  course = null,
  courseId = null,
  userRole = null
}) {
  const navigate = useNavigate()
  
  // Determine course type for enrichment logic
  const courseIsPersonalized = course ? isPersonalized(course) : false
  const courseIsMarketplace = course ? isMarketplace(course) : false
  const isLearner = userRole === 'learner'
  
  // For marketplace courses: Check if trainer added enrichment (view-only, no AI generation)
  const hasMarketplaceEnrichment = courseIsMarketplace && isLearner && course?.ai_assets && Object.keys(course.ai_assets).length > 0
  
  // State for marketplace enrichment visibility toggle (show by default if assets exist)
  const [showMarketplaceEnrichment, setShowMarketplaceEnrichment] = useState(false)
  
  // Update toggle state when enrichment becomes available - show by default if assets exist
  useEffect(() => {
    if (hasMarketplaceEnrichment) {
      setShowMarketplaceEnrichment(true)
    }
  }, [hasMarketplaceEnrichment])
  
  // Marketplace enrichment assets (directly from course.ai_assets - trainer-added)
  const marketplaceEnrichmentAssets = useMemo(() => {
    if (!hasMarketplaceEnrichment || !course?.ai_assets) return null
    return course.ai_assets
  }, [hasMarketplaceEnrichment, course?.ai_assets])
  
  if (!lesson) {
    return (
      <div className="page-surface bg-[var(--bg-primary)] transition-colors">
        <Container>
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
            <p className="text-lg font-semibold text-[var(--text-primary)]">Lesson data unavailable</p>
            <p className="text-sm text-[var(--text-secondary)]">Unable to display lesson content.</p>
          </div>
        </Container>
      </div>
    )
  }

  const lessonTitle = lesson?.title || lesson?.lesson_name || 'Lesson'
  const lessonSummary =
    lesson?.summary ||
    lesson?.description ||
    'Progress through this lesson to unlock exercises and the final assessment.'

  const lessonDuration = lesson?.duration
    ? typeof lesson.duration === 'string'
      ? lesson.duration
      : `${lesson.duration} mins`
    : 'Approx. 12 mins'

  return (
    <div className="page-surface bg-[var(--bg-primary)] transition-colors">
      <Container>
        <div className="flex flex-col gap-6 py-4">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {overviewHref && (
                  <Link to={overviewHref} className="inline-flex items-center gap-2 hover:text-[var(--primary-cyan)]">
                    <ArrowLeft size={16} />
                    Overview
                  </Link>
                )}
                <span className="text-[var(--text-muted)]">›</span>
                <span className="font-semibold text-[var(--text-primary)]">{lessonTitle}</span>
              </div>
              <div className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Lesson · Exercise · Assessment
              </div>
            </div>

            <section className="microservice-card refined space-y-4" style={{ textAlign: 'left' }}>
            <header className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[rgba(14,165,233,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0f766e]">
                  Lesson in progress
                </span>
                {isCompleted && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(16,185,129,0.14)] px-3 py-1 text-xs font-semibold text-[#047857]">
                    <CheckCircle2 size={14} />
                    Completed
                  </span>
                )}
                {isFinalLesson && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(245,158,11,0.16)] px-3 py-1 text-xs font-semibold text-[#b45309]">
                    <GraduationCap size={14} />
                    Final lesson
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold uppercase tracking-widest text-[var(--primary-cyan)]">
                  {courseTitle}
                </div>
                <h1 className="text-3xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {lessonTitle}
                </h1>
                <p className="text-base leading-7" style={{ color: 'var(--text-secondary)' }}>
                  {lessonSummary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-2">
                  <Clock size={16} />
                  {lessonDuration}
                </span>
                <span className="flex items-center gap-2">
                  <BookOpen size={16} />
                  {lesson?.content_type || 'Interactive learning'}
                </span>
                <span className="flex items-center gap-2">
                  <Sparkles size={16} />
                  {isCompleted ? 'Practice unlocked' : 'Complete to unlock practice'}
                </span>
              </div>
            </header>

            <LessonViewer
              lesson={lesson}
              onPrevious={onPrevious}
              onNext={isFinalLesson ? undefined : onNext}
              onComplete={isFinalLesson ? undefined : (() => onComplete?.(lesson))}
              isCompleted={isCompleted}
              onTakeTest={isFinalLesson ? onTakeTest : undefined}
              isFinalLesson={isFinalLesson}
            />

            {/* AI-Curated Resources Section */}
            <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border-subtle, var(--border-color))' }}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  AI-Curated Resources
                </h2>
                {/* Personalized courses: Button to request AI enrichment */}
                {courseIsPersonalized && isLearner && enrichmentAsset && (
                  <EnrichmentButton
                    asset={enrichmentAsset}
                    onResults={onEnrichmentResults || undefined}
                    onLoading={onEnrichmentLoading || undefined}
                    onError={onEnrichmentError || undefined}
                    buttonLabel={enrichmentLoading ? 'Generating...' : enrichmentAssets ? 'Refresh AI Resources' : 'Request AI Resources'}
                    disabled={!enrichmentAsset || enrichmentLoading}
                    hideModal={true}
                  />
                )}
                {/* Marketplace: Toggle button to show/hide trainer assets (no AI call, expand inline) */}
                {courseIsMarketplace && isLearner && hasMarketplaceEnrichment && (
                  <button
                    type="button"
                    onClick={() => setShowMarketplaceEnrichment(!showMarketplaceEnrichment)}
                    className="text-sm font-semibold text-[var(--primary-cyan)] hover:text-[var(--primary-blue)] transition-colors"
                  >
                    {showMarketplaceEnrichment ? 'Hide Enriched Content' : 'See Enriched Content'}
                  </button>
                )}
                {/* Trainer: AI generation button */}
                {userRole !== 'learner' && enrichmentAsset && (
                  <EnrichmentButton
                    asset={enrichmentAsset}
                    onResults={onEnrichmentResults || undefined}
                    onLoading={onEnrichmentLoading || undefined}
                    onError={onEnrichmentError || undefined}
                    buttonLabel={enrichmentAssets ? 'Refresh assets' : 'Load AI assets'}
                    disabled={!enrichmentAsset}
                  />
                )}
              </div>
              
              {/* Enrichment content */}
              {courseIsMarketplace && isLearner ? (
                // Marketplace: Only show if trainer added assets, toggle visibility inline
                hasMarketplaceEnrichment ? (
                  showMarketplaceEnrichment ? (
                    <LessonAssetsPanel assets={marketplaceEnrichmentAssets} loading={false} error={null} />
                  ) : null
                ) : (
                  <div className="rounded-lg border p-4 text-center" style={{ 
                    borderColor: 'var(--border-subtle, var(--border-color))',
                    backgroundColor: 'var(--bg-secondary)'
                  }}>
                    <p className="text-sm text-[var(--text-secondary)]">
                      No enriched content available for this course.
                    </p>
                  </div>
                )
              ) : courseIsPersonalized && isLearner ? (
                // Personalized: Course-level enrichment, show inline on every lesson page
                enrichmentLoading ? (
                  <div className="rounded-lg border p-4 text-center" style={{ 
                    borderColor: 'var(--border-subtle, var(--border-color))',
                    backgroundColor: 'var(--bg-secondary)'
                  }}>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Generating AI-curated resources...
                    </p>
                  </div>
                ) : enrichmentError ? (
                  <div className="rounded-lg border p-4 text-center" style={{ 
                    borderColor: 'rgba(248,113,113,0.32)',
                    backgroundColor: 'rgba(248,113,113,0.08)'
                  }}>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Failed to generate enrichment. Please try again.
                    </p>
                  </div>
                ) : enrichmentAssets && (enrichmentAssets.videos?.length > 0 || enrichmentAssets.repos?.length > 0) ? (
                  <LessonAssetsPanel assets={enrichmentAssets} loading={false} error={null} />
                ) : (
                  <div className="rounded-lg border p-4 text-center" style={{ 
                    borderColor: 'var(--border-subtle, var(--border-color))',
                    backgroundColor: 'var(--bg-secondary)'
                  }}>
                    <p className="text-sm text-[var(--text-secondary)]">
                      No enriched content generated yet. Click "Request AI Resources" above to generate.
                    </p>
                  </div>
                )
              ) : (
                // Trainer: Show dynamically loaded content
                <LessonAssetsPanel assets={enrichmentAssets} loading={enrichmentLoading} error={enrichmentError} />
              )}
            </div>

            <footer className="flex flex-col gap-4 rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[var(--bg-card)]/90 px-6 py-4 text-sm text-[var(--text-secondary)] backdrop-blur transition-colors md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-sm font-medium">
                <span className="rounded-full bg-[rgba(14,165,233,0.12)] p-2 text-[var(--primary-cyan)]">
                  {isCompleted ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}
                </span>
                <div className="space-y-1">
                  <div className="font-semibold text-[var(--text-primary)]">
                    {isCompleted
                      ? isFinalLesson
                        ? 'Final lesson completed – assessment unlocked'
                        : 'Lesson completed'
                      : 'Complete the lesson to track progress'}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{completionSummary}</div>
                </div>
              </div>
              {onTakeTest && (
                <button
                  type="button"
                  className="btn btn-primary shrink-0"
                  onClick={onTakeTest}
                >
                  <Target size={16} />
                  Take assessment
                </button>
              )}
            </footer>
          </section>
          </div>
        </div>
      </Container>
    </div>
  )
}

