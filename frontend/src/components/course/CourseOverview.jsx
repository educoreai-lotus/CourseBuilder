import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  Clock,
  Star,
  Layers,
  Award,
  ShieldCheck,
  Sparkles,
  PlayCircle,
  BookOpen,
  CheckCircle2,
  Target,
  MessageSquare,
  XCircle,
  Edit3
} from 'lucide-react'
import Container from '../Container.jsx'
import { isPersonalized, isMarketplace } from '../../utils/courseTypeUtils.js'

const getMetadataItems = (course) => {
  const topics = Array.isArray(course?.topics) ? course.topics : []
  const modules =
    topics.length > 0
      ? topics.flatMap((topic) => topic.modules || [])
      : Array.isArray(course?.modules)
        ? course.modules
        : []

  const lessonsCount =
    modules.length > 0
      ? modules.reduce((total, module) => total + (module.lessons?.length || 0), 0)
      : Array.isArray(course?.lessons)
        ? course.lessons.length
        : 0

  return [
    {
      icon: <Layers size={18} />,
      label: 'Modules',
      value: modules.length > 0 ? `${modules.length}` : 'Coming soon'
    },
    {
      icon: <BookOpen size={18} />,
      label: 'Lessons',
      value: lessonsCount > 0 ? `${lessonsCount}` : 'Preview'
    },
    {
      icon: <Clock size={18} />,
      label: 'Duration',
      value: course?.duration ? `${course.duration} mins` : 'Approx. 45 mins'
    },
    {
      icon: <ShieldCheck size={18} />,
      label: 'Difficulty',
      value: (course?.difficulty || course?.level || 'Mixed').toString()
    }
  ]
}

const buildInsightCards = (rating, totalLearners) => [
  {
    icon: <Users size={18} />,
    title: 'Learners enrolled',
    description: `${totalLearners} active learners`
  },
  {
    icon: <Star size={18} />,
    title: 'Satisfaction',
    description: `Average rating ${rating}/5`
  },
  {
    icon: <Sparkles size={18} />,
    title: 'Adaptive journey',
    description: 'Recommendations that adapt to your goals'
  }
]

const getSampleTopics = (course) => {
  const topics = Array.isArray(course?.topics) ? course.topics : []
  if (topics.length > 0) {
    return topics.slice(0, 3)
  }

  const modules = Array.isArray(course?.modules) ? course.modules : []
  if (modules.length > 0) {
    return modules.slice(0, 3).map((module, index) => ({
      id: module.id || module.module_id || `module-${index}`,
      title: module.title || module.module_name || module.name,
      description: module.summary || module.description,
      modules: [module]
    }))
  }

  return []
}

export default function CourseOverview({
  course,
  isEnrolled,
  onEnrollClick,
  onContinue,
  onCancelEnrollment,
  isSubmitting = false,
  showStructureCta = true,
  learnerProfile,
  progressSummary,
  backLink,
  hasFeedback = false,
  courseId = null
}) {
  if (!course) {
    return null
  }

  // Avoid variable shadowing — rename properly
  const isPersonalizedCourse = isPersonalized(course)
  const isMarketplaceCourse = isMarketplace(course)
  const personalized = isPersonalizedCourse // Keep for backward compatibility
  const metadata = getMetadataItems(course)
  const metadataTags = course?.metadata?.tags || course?.metadata?.skills || []
  const tags = course?.tags || course?.skills || metadataTags
  const summary = course?.summary || course?.description || course?.course_description
  const rating = Number(course?.rating || course?.average_rating || 4.7).toFixed(1)
  const totalLearners = course?.total_enrollments
    ? `${course.total_enrollments.toLocaleString()}+`
    : 'Growing'
  const insights = buildInsightCards(rating, totalLearners)
  const sampleTopics = getSampleTopics(course)

  const selectedBackLink = backLink ?? (personalized ? '/learner/personalized' : '/learner/marketplace')
  const instructorName = course?.trainer_name || course?.instructor || learnerProfile?.name || 'Expert instructor'

  const progressPercent = progressSummary?.progress ?? 0
  const completedLessons = progressSummary?.completed_lessons?.length || 0
  const coursePrice = course?.price ?? 0

  // For personalized courses, always show "Start Course" - never show enroll button
  const primaryCta = showStructureCta
    ? personalized
      ? (
          <button
            type="button"
            className="btn btn-primary flex items-center justify-center gap-2"
            onClick={onContinue}
          >
            <PlayCircle size={18} />
            Start Course
          </button>
        )
      : isEnrolled
        ? (
            <button
              type="button"
              className="btn btn-primary flex items-center justify-center gap-2"
              onClick={onContinue}
              disabled={isSubmitting}
            >
              <PlayCircle size={18} />
              Start Learning
            </button>
          )
        : (
            <button
              type="button"
              className="btn btn-primary flex items-center justify-center gap-2"
              onClick={onEnrollClick}
            >
              <Target size={18} />
              Enroll now
            </button>
          )
    : null

  const secondaryCta = showStructureCta
    ? personalized
      ? (
          <Link to="/learner/marketplace" className="btn btn-secondary flex items-center justify-center gap-2">
            <BookOpen size={18} />
            Explore marketplace
          </Link>
        )
      : isEnrolled
        ? (
            <Link to="/learner/enrolled" className="btn btn-secondary flex items-center justify-center gap-2">
              <CheckCircle2 size={18} />
              View progress
            </Link>
          )
        : (
            <Link to="/learner/enrolled" className="btn btn-secondary flex items-center justify-center gap-2">
              <BookOpen size={18} />
              My library
            </Link>
          )
    : null

  return (
    <div className="page-surface bg-[var(--bg-primary)] transition-colors">
      <Container>
        <div className="flex flex-col gap-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              to={selectedBackLink}
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft size={16} />
              Back to {personalized ? 'personalized courses' : 'marketplace'}
            </Link>
            <div className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Overview
            </div>
          </div>

          <section
            className="microservice-card refined grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]"
            style={{ textAlign: 'left' }}
          >
            <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    {isPersonalizedCourse && (
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                        style={{
                          background: 'var(--chip-surface, rgba(56, 189, 248, 0.16))',
                          color: 'var(--primary-purple, var(--primary-cyan))'
                        }}
                      >
                        PERSONALIZED
                      </span>
                    )}
                    {isMarketplaceCourse && (
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                        style={{
                          background: 'var(--chip-surface, rgba(56, 189, 248, 0.16))',
                          color: 'var(--primary-cyan)'
                        }}
                      >
                        MARKETPLACE
                      </span>
                    )}
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    background: 'var(--surface-muted, rgba(25, 36, 54, 0.9))',
                    color: 'var(--accent-green)'
                  }}
                >
                  {course?.metadata?.difficulty || course?.level || 'Intermediate'}
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {course.title || course.course_name}
                </h1>
                <p className="text-base leading-7" style={{ color: 'var(--text-secondary)' }}>
                  {summary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span className="font-medium">{instructorName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>{course?.metadata?.duration || `${course?.duration || 45} mins`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={16} style={{ color: 'var(--accent-gold)' }} />
                  <span className="font-medium">{rating}</span>
                  <span className="ml-1">({course?.students || totalLearners})</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {metadata.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border bg-[var(--bg-card)]/90 p-4 text-sm shadow-sm backdrop-blur transition-colors"
                    style={{ borderColor: 'var(--border-subtle, var(--border-color))', background: 'var(--bg-card)' }}
                  >
                    <div className="flex items-center gap-2 text-[var(--primary-cyan)]">
                      {item.icon}
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-4 rounded-3xl border bg-[var(--bg-card)]/90 p-6 shadow-lg backdrop-blur transition-colors" style={{ borderColor: 'var(--border-subtle, var(--border-color))' }}>
              <div className="space-y-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Course access
                </div>
                <div
                  className="text-3xl font-bold"
                  style={{ color: coursePrice === 0 || personalized ? 'var(--accent-green)' : 'var(--text-primary)' }}
                >
                  {personalized || coursePrice === 0 ? 'Included' : `$${coursePrice}`}
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {personalized
                    ? 'AI-powered journey tailored to your goals'
                    : 'Full course access with exercises & assessment'}
                </p>
              </div>

              <div className="space-y-3">
                {primaryCta}
                {secondaryCta}
                
                {/* Cancel Enrollment Button - Only shown when enrolled */}
                {!personalized && isEnrolled && onCancelEnrollment && showStructureCta && (
                  <button
                    type="button"
                    className="btn btn-outline-danger flex items-center justify-center gap-2 text-sm"
                    onClick={onCancelEnrollment}
                    disabled={isSubmitting}
                    style={{ 
                      marginTop: '8px',
                      borderColor: 'var(--accent-orange, #f97316)',
                      color: 'var(--accent-orange, #f97316)',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <XCircle size={16} />
                    {isSubmitting ? 'Cancelling...' : 'Cancel Enrollment'}
                  </button>
                )}
                
                {!personalized && !isEnrolled && showStructureCta && (
                  <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    Secure access in one click. Cancel anytime during preview.
                  </p>
                )}
                {personalized && showStructureCta && (
                  <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    Your personalized learning path is ready. Start learning now!
                  </p>
                )}
              </div>

              {progressSummary?.status && (
                <div className="rounded-2xl border p-4 text-sm" style={{ 
                  borderColor: 'var(--accent-green)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--accent-green)'
                }}>
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} />
                    Progress {Math.round(progressPercent)}% · {completedLessons} lessons complete
                  </div>
                  <p className="mt-2 text-xs" style={{ color: 'var(--accent-green)' }}>
                    {personalized
                      ? 'This is a personalized course, progress is tracked automatically.'
                      : 'Your progress is saved automatically. Continue learning anytime.'}
                  </p>
                </div>
              )}

              {/* Feedback Button - Show for enrolled learners */}
              {isEnrolled && courseId && showStructureCta && (
                <div className="flex items-center justify-center pt-4 border-t" style={{ borderColor: 'var(--border-subtle, var(--border-color))' }}>
                  {hasFeedback ? (
                    <Link
                      to={`/course/${courseId}/feedback`}
                      className="btn btn-secondary flex items-center justify-center gap-2 w-full"
                    >
                      <Edit3 size={18} />
                      Edit Feedback
                    </Link>
                  ) : (
                    <Link
                      to={`/course/${courseId}/feedback`}
                      className="btn btn-secondary flex items-center justify-center gap-2 w-full"
                    >
                      <MessageSquare size={18} />
                      Give Feedback
                    </Link>
                  )}
                </div>
              )}

              <ul className="flex flex-col gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                  Adaptive path recommendations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                  Downloadable resources & transcripts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                  Certificate on completion
                </li>
              </ul>
            </aside>
          </section>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <section className="microservice-card" style={{ textAlign: 'left' }}>
                <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  What you&apos;ll experience
                </h2>
                <p className="text-base leading-7 mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Designed for practical mastery with guided projects, peer-inspired challenges, and reflective checkpoints.
                  You&apos;ll learn through hands-on exercises, curated references, and adaptive prompts that keep pace with your progress.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {insights.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/90 p-5 text-sm shadow-sm backdrop-blur transition-colors"
                      style={{ background: 'var(--bg-card)' }}
                    >
                      <div className="flex items-center gap-3 text-[var(--primary-cyan)]">
                        {item.icon}
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </span>
                      </div>
                      <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="microservice-card" style={{ textAlign: 'left' }}>
                <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Course curriculum preview
                </h2>
                {sampleTopics.length > 0 ? (
                  <div className="space-y-4">
                    {sampleTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-5 shadow-sm backdrop-blur transition-colors"
                        style={{ background: 'var(--bg-card)' }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {topic.title}
                            </h3>
                            {topic.description && (
                              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {topic.description}
                              </p>
                            )}
                          </div>
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ 
                            background: 'var(--chip-surface, rgba(56, 189, 248, 0.16))',
                            color: 'var(--primary-cyan)'
                          }}>
                            {(topic.modules?.length || 1)} module{(topic.modules?.length || 1) > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div
                          className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <span>
                            {(topic.modules || []).reduce((acc, module) => acc + (module.lessons?.length || 0), 0)} lessons
                          </span>
                          <span>Guided projects</span>
                          <span>Reflection checkpoints</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <BookOpen size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {personalized 
                        ? 'Course curriculum will be available shortly.' 
                        : 'Module breakdown will unlock after enrollment.'}
                    </p>
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-6">
              <div className="microservice-card" style={{ textAlign: 'left' }}>
                <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Course milestones
                </h3>
                <ul className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} />
                    <span>Structured learning path with adaptive checkpoints</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} />
                    <span>Hands-on exercises and real-world scenario walkthroughs</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} />
                    <span>Final assessment and feedback loop to consolidate knowledge</span>
                  </li>
                </ul>
              </div>

              <div className="microservice-card" style={{ textAlign: 'left' }}>
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Skills you&apos;ll gain
                </h3>
                {tags && tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[rgba(14,165,233,0.12)] px-3 py-1 text-xs font-semibold text-[#0f766e]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Skills will populate as you progress through the course.
                  </p>
                )}
              </div>

              <div className="microservice-card" style={{ textAlign: 'left' }}>
                <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Instructor
                </h3>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: 'var(--gradient-primary)', color: 'var(--text-primary)' }}
                  >
                    <Award size={20} />
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {instructorName}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Industry expert & mentor
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </Container>
    </div>
  )
}

