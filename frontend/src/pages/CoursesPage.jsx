import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext'
import { getContextualErrorMessage } from '../utils/errorHandler.js'

export default function CoursesPage() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    level: '',
    sort: 'rating',
    page: 1,
    limit: 12
  })
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCourses()
  }, [filters])

  const loadCourses = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCourses(filters)
      setCourses(data.courses || [])
      setTotal(data.total || 0)
    } catch (err) {
      const errorMsg = getContextualErrorMessage(err, {
        network: 'Unable to connect. Please check your internet connection.',
        default: 'Failed to load courses'
      })
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const paginationTotal = Math.ceil(total / filters.limit)

  if (loading && courses.length === 0) {
    return (
      <div className="section-panel" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <p className="subtitle">Course catalogue</p>
            <h1>Browse curated learning experiences</h1>
            <p className="subtitle">
              Filter by level, sort by popularity, and explore expert-designed programmes across the emerald learning ecosystem.
            </p>
            <div className="hero-actions">
              <Link to="/learner/personalized" className="btn btn-primary">
                See personalised picks
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section-panel" style={{ marginTop: 'var(--spacing-xl)' }}>
        <form style={{ display: 'grid', gap: 'var(--spacing-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search courses..."
              style={{ width: '100%', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.35)', padding: '12px 16px 12px 44px' }}
            />
          </div>
          <select
            value={filters.level}
            onChange={(e) => handleFilterChange('level', e.target.value)}
            style={{ width: '100%', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.35)', padding: '12px 16px' }}
          >
            <option value="">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            style={{ width: '100%', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.35)', padding: '12px 16px' }}
          >
            <option value="rating">Highest rated</option>
            <option value="newest">Newest first</option>
            <option value="popular">Most popular</option>
          </select>
        </form>
        <div style={{ marginTop: 'var(--spacing-md)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {error ? error : `Found ${total} course${total === 1 ? '' : 's'}`}
        </div>
      </section>

      {courses.length === 0 && !loading ? (
        <section className="section-panel" style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
          <i className="fas fa-book-open" style={{ fontSize: '2.5rem', color: 'var(--primary-cyan)' }} />
          <h2 style={{ marginTop: 'var(--spacing-md)', fontSize: '1.75rem', fontWeight: 600 }}>No courses match your filters</h2>
          <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-muted)' }}>
            Try adjusting the level or keyword search to explore more options.
          </p>
        </section>
      ) : (
        <section className="course-grid" style={{ marginTop: 'var(--spacing-xl)' }}>
          {courses.map(course => (
            <Link key={course.id || course.course_id} to={`/courses/${course.id || course.course_id}`} className="course-card" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
                <span className="tag-chip" style={{ background: 'rgba(99,102,241,0.12)', color: '#4338ca' }}>
                  <i className="fa-solid fa-graduation-cap" />
                  {course.level || 'All levels'}
                </span>
                <span className="status-chip" style={{ background: 'rgba(234,179,8,0.12)', color: '#b45309' }}>
                  <i className="fa-solid fa-star" />
                  {(course.rating || course.average_rating || 4.5).toFixed(1)}
                </span>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{course.title || course.course_name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {course.description || course.course_description || 'No description available.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span><i className="fas fa-clock" style={{ marginRight: '6px' }} />{course.duration ? `${course.duration} min` : 'Approx. 45 min / lesson'}</span>
                <span><i className="fas fa-users" style={{ marginRight: '6px' }} />{course.total_enrollments ? `${course.total_enrollments}+ learners` : 'Popular'}</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {paginationTotal > 1 && (
        <section className="section-panel" style={{ marginTop: 'var(--spacing-xl)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <button
            type="button"
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={filters.page === 1}
            className="btn btn-secondary"
          >
            <i className="fas fa-chevron-left" /> Previous
          </button>
          <span style={{ fontWeight: 600 }}>
            Page {filters.page} of {paginationTotal}
          </span>
          <button
            type="button"
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={filters.page >= paginationTotal}
            className="btn btn-secondary"
          >
            Next <i className="fas fa-chevron-right" />
          </button>
        </section>
      )}
    </div>
  )
}
