import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useUserStore from '../store/useUserStore'
import CourseCard from '../components/CourseCard'
import LoadingSpinner from '../components/LoadingSpinner'
import Container from '../components/Container'
import api from '../services/api'
import { BookOpen, CheckCircle, Zap, Award, Sparkles, ShoppingBag, Play } from 'lucide-react'

function Home() {
  const { currentUser, enrolledCourses, getCourseProgress } = useUserStore()
  const [marketplaceCourses, setMarketplaceCourses] = useState([])
  const [personalizedCourses, setPersonalizedCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCourses = async () => {
      setIsLoading(true)
      try {
        // Load courses from backend API
        const response = await api.course.getCourses()
        if (response.success) {
          const allCourses = response.data
          // Filter marketplace courses (non-personalized)
          const marketplace = allCourses.filter(course => course.courseType !== 'personalized').slice(0, 3)
          // Filter personalized courses
          const personalized = allCourses.filter(course => course.courseType === 'personalized')
          
          setMarketplaceCourses(marketplace)
          setPersonalizedCourses(personalized)
        }
      } catch (error) {
        console.error('Failed to load courses:', error)
        // Fallback to empty arrays if API fails
        setMarketplaceCourses([])
        setPersonalizedCourses([])
      } finally {
        setIsLoading(false)
      }
    }

    loadCourses()
  }, [])

  if (isLoading) {
    return <LoadingSpinner message="Loading your dashboard..." />
  }

  const enrolledCount = enrolledCourses.length
  const completedCount = enrolledCourses.filter(courseId => {
    const progress = getCourseProgress(courseId)
    return progress.progressPercentage === 100
  }).length

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Hero Section */}
      <div style={{ background: 'var(--bg-card)' }}>
        <Container className="py-16">
          <div className="text-center">
            <h1 className="hero-content h1" style={{ color: 'var(--text-primary)' }}>
              Welcome to EDUCORE AI, {currentUser?.name || 'Learner'}!
            </h1>
            <p className="hero-content subtitle" style={{ color: 'var(--text-secondary)' }}>
              Continue your learning journey and discover new skills to advance your career
            </p>
          </div>
        </Container>
      </div>

      {/* Stats Section */}
      <Container className="py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="dashboard-card">
            <div className="dashboard-icon">
              <BookOpen size={24} />
            </div>
            <h3 style={{ color: 'var(--text-primary)' }}>Enrolled Courses</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{enrolledCount}</p>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-icon" style={{ background: 'var(--gradient-secondary)' }}>
              <CheckCircle size={24} />
            </div>
            <h3 style={{ color: 'var(--text-primary)' }}>Completed</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{completedCount}</p>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-icon" style={{ background: 'var(--gradient-accent)' }}>
              <Zap size={24} />
            </div>
            <h3 style={{ color: 'var(--text-primary)' }}>Learning Streak</h3>
            <p style={{ color: 'var(--text-secondary)' }}>7 days</p>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-icon" style={{ background: 'var(--gradient-primary)' }}>
              <Award size={24} />
            </div>
            <h3 style={{ color: 'var(--text-primary)' }}>Achievements</h3>
            <p style={{ color: 'var(--text-secondary)' }}>12</p>
          </div>
        </div>
      </Container>

      {/* Main Content */}
      <Container className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personalized Learning */}
          <div className="microservice-card">
            <div className="flex items-center mb-6">
              <div className="service-icon" style={{ background: 'var(--gradient-secondary)' }}>
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="microservice-card h3" style={{ color: 'var(--text-primary)' }}>Personalized Learning</h2>
                <p className="microservice-card p" style={{ color: 'var(--text-secondary)' }}>AI-powered courses tailored just for you</p>
              </div>
            </div>
            
            {personalizedCourses.length > 0 ? (
              <div className="space-y-4">
                {personalizedCourses.map(course => (
                  <div key={course.id} className="floating-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="card-title mb-1">{course.title}</h3>
                        <p className="progress-text">{course.description}</p>
                      </div>
                      <span className="badge badge-purple">Personalized</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span className="mr-4">{course.metadata?.duration || 'Unknown Duration'}</span>
                        <span>AI-Powered</span>
                      </div>
                      <Link
                        to={`/study/${course.id}`}
                        className="btn btn-primary text-sm flex items-center gap-2"
                      >
                        <Play size={16} />
                        Start Learning
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-secondary)' }}>
                  <Sparkles size={32} />
                </div>
                <p className="microservice-card p mb-4" style={{ color: 'var(--text-secondary)' }}>No personalized courses yet</p>
                <Link 
                  to="/personalized"
                  className="btn btn-primary"
                >
                  Get Personalized Courses
                </Link>
              </div>
            )}
          </div>

          {/* Marketplace */}
          <div className="microservice-card">
            <div className="flex items-center mb-6">
              <div className="service-icon" style={{ background: 'var(--gradient-primary)' }}>
                <ShoppingBag size={24} />
              </div>
              <div>
                <h2 className="microservice-card h3" style={{ color: 'var(--text-primary)' }}>Marketplace</h2>
                <p className="microservice-card p" style={{ color: 'var(--text-secondary)' }}>Discover courses from expert instructors</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {marketplaceCourses.map(course => (
                <div key={course.id} className="floating-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="card-title mb-1">{course.title}</h3>
                      <p className="progress-text">{course.description}</p>
                    </div>
                    <span className="badge badge-blue">Marketplace</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      <span className="mr-4">{course.instructor || 'Unknown Instructor'}</span>
                      <span className="mr-4">{course.metadata?.duration || 'Unknown Duration'}</span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" style={{ color: 'var(--accent-gold)' }} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {course.rating || 0}
                      </span>
                    </div>
                    <Link
                      to={`/course/${course.id}`}
                      className="btn btn-primary text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <Link 
                to="/marketplace"
                className="btn btn-primary"
              >
                Browse All Courses
              </Link>
            </div>
          </div>
        </div>

        {/* Continue Learning */}
        {enrolledCount > 0 && (
          <div className="microservice-card mt-8">
            <h2 className="microservice-card h3 mb-6" style={{ color: 'var(--text-primary)' }}>Continue Learning</h2>
            <div className="text-center py-8">
              <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
                <BookOpen size={32} />
              </div>
              <p className="microservice-card p mb-4" style={{ color: 'var(--text-secondary)' }}>You have {enrolledCount} enrolled course{enrolledCount !== 1 ? 's' : ''}</p>
              <Link 
                to="/library"
                className="btn btn-primary"
              >
                View My Library
              </Link>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="microservice-card mt-8" style={{ background: 'var(--gradient-primary)' }}>
          <div className="text-center">
            <h2 className="microservice-card h3 mb-4" >Ready to Start Learning?</h2>
            <p className="microservice-card p mb-8" >
              Choose your learning path and begin your journey to mastery
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/marketplace"
                className="btn btn-secondary"
                style={{ background: 'white', color: 'var(--primary-blue)', border: 'none' }}
              >
                Browse Marketplace
              </Link>
              <Link 
                to="/personalized"
                className="btn btn-secondary"
                style={{ background: 'var(--accent-gold)', color: 'white', border: 'none' }}
              >
                Get Personalized
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default Home