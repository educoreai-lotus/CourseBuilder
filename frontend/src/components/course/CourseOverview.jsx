import { Link } from 'react-router-dom'

const getMetadataItems = (course) => {
  const topics = Array.isArray(course?.topics) ? course.topics : []
  const modules = topics.length > 0
    ? topics.flatMap(topic => topic.modules || [])
    : Array.isArray(course?.modules) ? course.modules : []

  return [
    {
      icon: 'fa-layer-group',
      label: 'Modules',
      value: modules.length > 0 ? `${modules.length}` : 'N/A'
    },
    {
      icon: 'fa-file-lines',
      label: 'Lessons',
      value: modules.length > 0
        ? modules.reduce((total, module) => total + (module.lessons?.length || 0), 0)
        : Array.isArray(course?.lessons) ? course.lessons.length : 'N/A'
    },
    {
      icon: 'fa-clock',
      label: 'Duration',
      value: course?.duration ? `${course.duration} mins` : 'Approx. 45 mins'
    },
    {
      icon: 'fa-signal',
      label: 'Difficulty',
      value: (course?.difficulty || course?.level || 'Mixed').toString()
    }
  ]
}

export default function CourseOverview({
  course,
  isEnrolled,
  onEnrollClick,
  onContinue,
  showStructureCta = true,
  learnerProfile,
  progressSummary
}) {
  if (!course) {
    return null
  }

  const metadata = getMetadataItems(course)
  const metadataTags = course?.metadata?.tags || course?.metadata?.skills || []
  const tags = course?.tags || course?.skills || metadataTags
  const summary = course?.summary || course?.description || course?.course_description

  return (
    <div className="personalized-dashboard">
      <nav className="breadcrumb" aria-label="Course breadcrumb">
        <span>Overview</span>
        {isEnrolled && <span>Structure</span>}
        {isEnrolled && <span>Lesson</span>}
      </nav>

      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <p className="subtitle">Course overview</p>
            <h1>{course.title || course.course_name}</h1>
            <p className="subtitle">{summary}</p>

            <div className="hero-stats">
              {metadata.map((item) => (
                <div className="stat" key={item.label}>
                  <span className="stat-number">
                    <i className={`fa-solid ${item.icon}`} style={{ marginRight: '8px' }} />
                    {item.value}
                  </span>
                  <span className="stat-label">{item.label}</span>
                </div>
              ))}
            </div>

            {showStructureCta && (
              <div className="hero-actions">
                {!isEnrolled ? (
                  <button type="button" className="btn btn-primary" onClick={onEnrollClick}>
                    <i className="fa-solid fa-user-plus" />
                    Enroll now
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={onContinue}>
                    <i className="fa-solid fa-diagram-project" />
                    Continue to structure
                  </button>
                )}

                <Link to="/learner/enrolled" className="btn btn-secondary">
                  <i className="fa-solid fa-bookmark" />
                  My courses
                </Link>
              </div>
            )}
          </div>

          <div className="hero-visual">
            <div className="floating-card" aria-label="Course summary metrics" style={{ gap: 'var(--spacing-md)' }}>
              <div className="card-header">
                <div className="card-icon">
                  <i className="fa-solid fa-graduation-cap" />
                </div>
                <span className="card-title">What you&apos;ll experience</span>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <li>
                  <strong>{course?.total_enrollments || 'Growing'}</strong> learners already enrolled
                </li>
                <li>
                  Learner satisfaction score{' '}
                  <strong>{(course?.rating || course?.average_rating || 4.7).toFixed(1)}</strong>/5
                </li>
                <li>
                  Adaptive recommendations tailored to your goals
                </li>
              </ul>
            </div>

            {isEnrolled && progressSummary && (
              <div className="floating-card" aria-label="Your enrollment status">
                <div className="card-header">
                  <div className="card-icon">
                    <i className="fa-solid fa-circle-check" />
                  </div>
                  <span className="card-title">You&apos;re enrolled</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>Learner:</span>{' '}
                    <span>{learnerProfile?.name || 'You'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <span className="status-chip" style={{ background: 'rgba(14,165,233,0.12)', color: '#0f766e' }}>
                      <i className="fa-solid fa-chart-line" /> {Math.round(progressSummary.progress ?? 0)}%
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {progressSummary.status?.replace('_', ' ') || 'in progress'}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)' }}>
                    {progressSummary.completed_lessons?.length || 0} lesson
                    {progressSummary.completed_lessons?.length === 1 ? '' : 's'} completed so far.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {tags.length > 0 && (
        <section className="section-panel" style={{ marginTop: 'var(--spacing-xl)' }}>
          <header className="section-heading">
            <div>
              <h2>Key focus areas</h2>
              <p>Curated skill domains and competencies addressed in this course.</p>
            </div>
          </header>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            {tags.map((tag, idx) => (
              <span className="tag-chip" key={`${tag}-${idx}`}>
                <i className="fa-solid fa-hashtag" />
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

