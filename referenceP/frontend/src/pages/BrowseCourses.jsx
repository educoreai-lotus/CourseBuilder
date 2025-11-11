import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import useCourseStore from '../store/useCourseStore'
import CourseCard from '../components/CourseCard'

function BrowseCourses() {
  const { courses, fetchCourses, isLoading } = useCourseStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('title')

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const filteredCourses = useMemo(() => {
    let filtered = courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesDifficulty = filterDifficulty === 'all' || course.metadata.difficulty === filterDifficulty
      const matchesType = filterType === 'all' || course.courseType === filterType
      
      return matchesSearch && matchesDifficulty && matchesType
    })

    // Sort courses
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'rating':
          return b.rating - a.rating
        case 'difficulty':
          const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3, 'adaptive': 4 }
          return difficultyOrder[a.metadata.difficulty] - difficultyOrder[b.metadata.difficulty]
        case 'duration':
          return a.metadata.duration.localeCompare(b.metadata.duration)
        default:
          return 0
      }
    })

    return filtered
  }, [courses, searchTerm, filterDifficulty, filterType, sortBy])

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>Loading courses...</p>
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <h1 className="section-title" style={{ textAlign: 'left', marginBottom: 'var(--spacing-md)' }}>
            Browse Courses 📚
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Discover amazing courses and start your learning journey
          </p>
        </div>

        {/* Search and Filters */}
        <div className="dashboard-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ 
            padding: 'var(--spacing-lg)', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
              Search & Filter
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
              {/* Search Input */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-xs)' }}>
                  Search Courses
                </label>
                <input
                  type="text"
                  placeholder="Search by title, description, or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Difficulty Filter */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-xs)' }}>
                  Difficulty
                </label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="adaptive">Adaptive</option>
                </select>
              </div>

              {/* Course Type Filter */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-xs)' }}>
                  Course Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="personalized">Personalized</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-xs)' }}>
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="title">Title</option>
                  <option value="rating">Rating</option>
                  <option value="difficulty">Difficulty</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600' }}>
                {filteredCourses.length} courses found
              </h3>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '0.8rem',
                  background: 'var(--accent-green)',
                  color: 'white'
                }}>
                  {courses.filter(c => c.courseType === 'marketplace').length} Marketplace
                </span>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '0.8rem',
                  background: 'var(--accent-gold)',
                  color: 'white'
                }}>
                  {courses.filter(c => c.courseType === 'personalized').length} Personalized
                </span>
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                <div className="dashboard-icon" style={{ margin: '0 auto var(--spacing-lg)' }}>
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: 'var(--spacing-sm)' }}>No courses found</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--spacing-lg)' }}>
                {filteredCourses.map(course => (
                  <div key={course.id} style={{ position: 'relative' }}>
                    {/* Course Type Badge */}
                    <div style={{
                      position: 'absolute',
                      top: 'var(--spacing-md)',
                      right: 'var(--spacing-md)',
                      zIndex: 10
                    }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: course.courseType === 'personalized' ? 'var(--accent-gold)' : 'var(--accent-green)',
                        color: 'white'
                      }}>
                        {course.courseType === 'personalized' ? '🎯 Personalized' : '🏪 Marketplace'}
                      </span>
                    </div>
                    
                    <CourseCard 
                      id={course.id}
                      title={course.title}
                      description={course.description}
                      trainer={course.instructor}
                      difficulty={course.metadata.difficulty}
                      duration={course.metadata.duration}
                      rating={course.rating}
                      skills={course.skills}
                      status={course.status}
                      courseType={course.courseType}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrowseCourses

