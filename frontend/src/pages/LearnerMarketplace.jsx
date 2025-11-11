import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext.jsx'
import Container from '../components/Container.jsx'

export default function LearnerMarketplace() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async (filters = {}) => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 60, ...filters })
      const marketplaceCourses = (data.courses || []).filter((course) => {
        const meta = course.metadata || {}
        return meta.personalized !== true && meta.source !== 'learner_ai'
      })
      setCourses(marketplaceCourses)
    } catch (err) {
      showToast('Failed to load marketplace courses', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    const filters = {}
    if (query) filters.search = query
    if (level !== 'all') filters.level = level
    loadCourses(filters)
  }

  return (
    <div className="personalized-dashboard">
      <Container>
        <div className="section-panel space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--primary-cyan)]">
              Marketplace
            </p>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
              Marketplace Courses
            </h1>
            <p className="max-w-3xl text-[var(--text-secondary)]">
              Search the course catalog, filter by level, and enrol in programs that match your learning goals.
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="grid gap-4 rounded-[var(--radius-xl)] border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] md:grid-cols-[1.5fr,1fr,auto]"
          >
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by course, topic, trainer..."
                className="w-full rounded-2xl border border-[rgba(148,163,184,0.35)] bg-white/90 py-3 pl-12 pr-4 text-sm text-[var(--text-primary)] shadow-sm backdrop-blur focus:border-[var(--primary-cyan)] focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,233,0.25)]"
              />
            </div>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-2xl border border-[rgba(148,163,184,0.35)] bg-white/90 px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm backdrop-blur focus:border-[var(--primary-cyan)] focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,233,0.25)]"
            >
              <option value="all">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button type="submit" className="btn btn-primary px-6 py-3">
              Apply filters
            </button>
          </form>
        </div>
      </Container>

      {loading ? (
        <Container>
          <div className="section-panel">
            <div className="surface-card soft flex min-h-[50vh] items-center justify-center">
              <LoadingSpinner message="Discovering courses..." />
            </div>
          </div>
        </Container>
      ) : courses.length === 0 ? (
        <Container>
          <div className="section-panel">
            <section className="surface-card soft text-center space-y-4">
              <i className="fa-solid fa-magnifying-glass text-3xl text-[var(--primary-cyan)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">No courses match your filters</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Try adjusting the level or keywords to explore more learning options.
              </p>
            </section>
          </div>
        </Container>
      ) : (
        <Container>
          <div className="section-panel">
            <div className="course-grid">
              {courses.map(course => {
                const tags = Array.isArray(course.tags) ? course.tags : []
                const displayTags = tags.length > 0 ? tags.slice(0, 2) : ['Skill builder', 'Project-based']

                return (
                  <div key={course.id || course.course_id} className="course-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)' }}>
                      <div>
                        <span className="tag-chip" style={{ marginBottom: 'var(--spacing-sm)' }}>
                          <i className="fa-solid fa-graduation-cap" />
                          {course.level || 'Beginner'}
                        </span>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{course.title || course.course_name}</h3>
                        <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-muted)' }}>
                          {course.description || course.course_description || 'Accelerate your learning with actionable insights and guided projects.'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className="status-chip" style={{ background: 'rgba(234,179,8,0.12)', color: '#b45309' }}>
                          <i className="fa-solid fa-star" />
                          {(course.rating || course.average_rating || 4.6).toFixed(1)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {course.total_enrollments ? `${course.total_enrollments}+ learners` : 'Popular choice'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span className="status-chip" style={{ background: 'rgba(59,130,246,0.1)', color: '#1d4ed8' }}>
                        <i className="fa-solid fa-layer-group" />
                        {course.modules?.length || 4} modules
                      </span>
                      <span className="status-chip" style={{ background: 'rgba(16,185,129,0.12)', color: '#047857' }}>
                        <i className="fa-solid fa-clock" />
                        {course.duration ? `${course.duration} mins` : '45 mins / lesson'}
                      </span>
                      <span className="status-chip">
                        <i className="fa-solid fa-tag" />
                        {displayTags.join(' · ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-lg)' }}>
                      <span className="status-chip" style={{ background: course.visibility === 'private' ? 'rgba(239,68,68,0.12)' : 'rgba(6,95,70,0.08)', color: course.visibility === 'private' ? '#b91c1c' : '#047857' }}>
                        <i className="fa-solid fa-shield-halved" />
                        {course.visibility === 'private' ? 'Invite only' : 'Open enrollment'}
                      </span>
                      <Link to={`/courses/${course.id || course.course_id}`} className="btn btn-primary" style={{ padding: '10px 20px' }}>
                        View details <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Container>
      )}
    </div>
  )
}

