import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CourseCard from '../components/CourseCard'
import LoadingSpinner from '../components/LoadingSpinner'
import Container from '../components/Container'
import api from '../services/api'
import { Search, Filter, SortAsc } from 'lucide-react'

function Marketplace() {
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [sortBy, setSortBy] = useState('title')

  useEffect(() => {
    const loadCourses = async () => {
      setIsLoading(true)
      try {
        // Load courses from backend API
        const response = await api.course.getCourses()
        if (response.success) {
          // Filter only marketplace courses (non-personalized)
          const marketplaceCourses = response.data.filter(course => course.courseType !== 'personalized')
          setCourses(marketplaceCourses)
        }
      } catch (error) {
        console.error('Failed to load courses:', error)
        setCourses([])
      } finally {
        setIsLoading(false)
      }
    }

    loadCourses()
  }, [])

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (course.metadata?.skills || []).some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesDifficulty = filterDifficulty === 'all' || course.metadata?.difficulty === filterDifficulty
    
    return matchesSearch && matchesDifficulty
  }).sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title)
    } else if (sortBy === 'rating') {
      return b.rating - a.rating
    } else if (sortBy === 'price') {
      return a.price - b.price
    }
    return 0
  })

  if (isLoading) {
    return <LoadingSpinner message="Loading marketplace courses..." />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Container className="py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="hero-content h1" style={{ color: 'var(--text-primary)' }}>
            EDUCORE AI Marketplace
          </h1>
          <p className="hero-content subtitle" style={{ color: 'var(--text-secondary)' }}>
            Discover and enroll in courses created by expert instructors. 
            Build your skills with structured learning paths and earn certificates.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="microservice-card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Search Courses
              </label>
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search courses, skills, or instructors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Difficulty
              </label>
              <div className="relative">
                <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="select pl-10"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Sort By
              </label>
              <div className="relative">
                <SortAsc size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="select pl-10"
                >
                  <option value="title">Title</option>
                  <option value="rating">Rating</option>
                  <option value="price">Price</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterDifficulty('all')
                  setSortBy('title')
                }}
                className="btn btn-secondary w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Showing {filteredCourses.length} of {courses.length} courses
          </p>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                showEnrollButton={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
              <Search size={32} />
            </div>
            <h3 className="microservice-card h3 mb-2" style={{ color: 'var(--text-primary)' }}>
              No courses found
            </h3>
            <p className="microservice-card p mb-6" style={{ color: 'var(--text-secondary)' }}>
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterDifficulty('all')
                setSortBy('title')
              }}
              className="btn btn-primary"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </Container>
    </div>
  )
}

export default Marketplace