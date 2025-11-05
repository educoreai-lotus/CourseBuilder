import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext'

export default function CoursesPage() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    level: '',
    category: '',
    sort: 'rating',
    page: 1,
    limit: 12
  })
  const [total, setTotal] = useState(0)

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
      setError(err.message || 'Failed to load courses')
      showToast('Failed to load courses', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  if (loading && courses.length === 0) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
      <div className="microservices-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 className="section-title" style={{ marginBottom: 'var(--spacing-xl)' }}>
          Browse Courses
        </h1>

        {/* Filters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-xl)',
          padding: 'var(--spacing-lg)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <input
            type="text"
            placeholder="Search courses..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            style={{ padding: 'var(--spacing-sm)' }}
          />
          <select
            value={filters.level}
            onChange={(e) => handleFilterChange('level', e.target.value)}
            style={{ padding: 'var(--spacing-sm)' }}
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            style={{ padding: 'var(--spacing-sm)' }}
          >
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        {/* Results Count */}
        <div style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--text-secondary)' }}>
          Found {total} course{total !== 1 ? 's' : ''}
        </div>

        {/* Courses Grid */}
        {courses.length === 0 && !loading ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-2xl)',
            color: 'var(--text-muted)'
          }}>
            <i className="fas fa-book-open" style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}></i>
            <p>No courses found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="microservices-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--spacing-lg)'
          }}>
            {courses.map(course => (
              <Link
                key={course.id || course.course_id}
                to={`/courses/${course.id || course.course_id}`}
                className="microservice-card"
                style={{ textDecoration: 'none' }}
              >
                <div className="service-icon" style={{
                  background: 'var(--gradient-brand)'
                }}>
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <h3 className="microservice-card h3" style={{
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  marginBottom: 'var(--spacing-sm)',
                  color: 'var(--text-primary)'
                }}>
                  {course.title || course.course_name}
                </h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  marginBottom: 'var(--spacing-md)',
                  lineHeight: 1.5
                }}>
                  {course.description || course.course_description || 'No description available.'}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto'
                }}>
                  <span style={{
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    background: 'rgba(0, 166, 118, 0.1)',
                    color: 'var(--primary-emerald)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    textTransform: 'capitalize'
                  }}>
                    {course.level || 'All Levels'}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    color: '#FACC15'
                  }}>
                    <i className="fas fa-star"></i>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {course.rating || course.average_rating || '4.5'}
                    </span>
                  </div>
                </div>
                {course.duration && (
                  <div style={{
                    marginTop: 'var(--spacing-sm)',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                  }}>
                    <i className="fas fa-clock mr-2"></i>
                    {course.duration} min
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > filters.limit && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'var(--spacing-sm)',
            marginTop: 'var(--spacing-xl)'
          }}>
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={filters.page === 1}
              className="btn btn-secondary"
            >
              <i className="fas fa-chevron-left"></i> Previous
            </button>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              color: 'var(--text-primary)'
            }}>
              Page {filters.page} of {Math.ceil(total / filters.limit)}
            </span>
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={filters.page >= Math.ceil(total / filters.limit)}
              className="btn btn-secondary"
            >
              Next <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
      <Toast />
    </div>
  )
}
