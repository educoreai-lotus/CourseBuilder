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
      // Filter: Only show active courses (published) that are not personalized
      const marketplaceCourses = (data.courses || []).filter((course) => {
        // Must be active (published)
        if (course.status !== 'active') return false
        // Must be trainer course (not learner_specific)
        if (course.course_type === 'learner_specific') return false
        // Exclude personalized courses
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
        <div className="section-panel space-y-6">
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
                    <div className="flex justify-between gap-4">
                      <div className="flex-1">
                        <span className="tag-chip mb-2 block">
                          <i className="fa-solid fa-graduation-cap" />
                          {course.level || 'Beginner'}
                        </span>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)]">{course.title || course.course_name}</h3>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {course.description || course.course_description || 'Accelerate your learning with actionable insights and guided projects.'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="status-chip status-chip-rating">
                          <i className="fa-solid fa-star" />
                          {(course.rating || course.average_rating || 4.6).toFixed(1)}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {course.total_enrollments ? `${course.total_enrollments}+ learners` : 'Popular choice'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4 text-sm text-[var(--text-muted)]">
                      <span className="status-chip status-chip-blue">
                        <i className="fa-solid fa-layer-group" />
                        {course.modules?.length || 4} modules
                      </span>
                      <span className="status-chip status-chip-success">
                        <i className="fa-solid fa-clock" />
                        {course.duration ? `${course.duration} mins` : '45 mins / lesson'}
                      </span>
                      {course.ai_assets && Object.keys(course.ai_assets).length > 0 && (
                        <span className="status-chip status-chip-purple">
                          <i className="fa-solid fa-sparkles" />
                          AI Enriched
                        </span>
                      )}
                      <span className="status-chip">
                        <i className="fa-solid fa-tag" />
                        {displayTags.join(' · ')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-6">
                      <span className={`status-chip ${course.visibility === 'private' ? 'status-chip-danger' : 'status-chip-success'}`}>
                        <i className="fa-solid fa-shield-halved" />
                        {course.visibility === 'private' ? 'Invite only' : 'Open enrollment'}
                      </span>
                      <Link to={`/courses/${course.id || course.course_id}`} className="btn btn-primary btn-sm flex items-center gap-2">
                        View details <i className="fa-solid fa-arrow-right" />
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

