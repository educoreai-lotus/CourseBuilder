import { Link } from 'react-router-dom'

export default function CourseCard({ course, showProgress = false, progress = 0, to }) {
  const courseId = course.id || course.course_id
  const title = course.title || course.course_name
  const description = course.description || course.course_description
  const level = (course.level || 'beginner').toString()
  const rating = Number(course.rating || course.average_rating || 0)
  const status = (course.status || 'live').toString()
  const duration = course.duration ? `${course.duration} mins` : 'Approx. 45 mins'
  const displayProgress = showProgress && progress > 0
  const destination = to ?? `/courses/${courseId}`
  const metadata = course.metadata || {}
  const isPersonalized = Boolean(metadata.personalized) || metadata.source === 'learner_ai'
  const skillChips = Array.isArray(metadata.skills) ? metadata.skills.slice(0, 4) : []

  return (
    <Link
      to={destination}
      className="course-card block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-cyan)]/40 focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[rgba(15,118,110,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--primary-cyan)]">
              {level}
            </span>
            {isPersonalized && (
              <span className="rounded-full bg-[rgba(124,58,237,0.16)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#6d28d9]">
                AI Path
              </span>
            )}
            {status !== 'live' && (
              <span className="rounded-full bg-[rgba(148,163,184,0.18)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {status}
              </span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-[var(--text-primary)] leading-snug">{title}</h3>
          <p
            className="text-sm leading-6 text-[var(--text-secondary)]"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {description || 'No description available.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#FACC15]">
            <i className="fas fa-star" aria-hidden="true"></i>
            <span className="text-base font-semibold text-[var(--text-primary)]">
              {rating.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
            <i className="fas fa-clock" aria-hidden="true"></i>
            <span>{duration}</span>
          </div>
        </div>

        {skillChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skillChips.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-[rgba(14,165,233,0.12)] px-3 py-1 text-xs font-semibold text-[#0f766e]"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {displayProgress && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
                background:
                  'linear-gradient(90deg, rgba(6, 95, 70, 0.95), rgba(15, 118, 110, 0.8))'
              }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}

