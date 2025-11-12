import { Link } from 'react-router-dom'
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

export default function LessonView({
  courseTitle,
  lesson,
  onPrevious,
  onNext,
  onComplete,
  isCompleted,
  completionSummary,
  onTakeTest,
  canTakeTest = false,
  isFinalLesson = false,
  structureHref,
  overviewHref,
  enrichmentAssets,
  enrichmentLoading = false,
  enrichmentError = null
}) {
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
        <div className="flex flex-col gap-10 py-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {structureHref && (
                <Link to={structureHref} className="inline-flex items-center gap-2 hover:text-[var(--primary-cyan)]">
                  <ArrowLeft size={16} />
                  Structure
                </Link>
              )}
              <span className="text-[var(--text-muted)]">›</span>
              {overviewHref && (
                <Link to={overviewHref} className="hover:text-[var(--primary-cyan)]">
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

          <section className="microservice-card refined space-y-6" style={{ textAlign: 'left' }}>
            <header className="space-y-4">
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

              <div className="space-y-3">
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
              onComplete={() => onComplete?.(lesson)}
              isCompleted={isCompleted}
              onTakeTest={isFinalLesson ? onTakeTest : undefined}
              canTakeTest={canTakeTest}
              isFinalLesson={isFinalLesson}
            />

            <LessonAssetsPanel assets={enrichmentAssets} loading={enrichmentLoading} error={enrichmentError} />

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
                  className={`btn ${canTakeTest ? 'btn-primary' : 'btn-secondary'} shrink-0`}
                  onClick={onTakeTest}
                  disabled={!canTakeTest}
                >
                  {canTakeTest ? (
                    <>
                      <Target size={16} />
                      Take assessment
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Finish lesson to unlock
                    </>
                  )}
                </button>
              )}
            </footer>
          </section>
        </div>
      </Container>
    </div>
  )
}

