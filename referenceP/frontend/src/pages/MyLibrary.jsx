import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useUserStore from '../store/useUserStore'
import LoadingSpinner from '../components/LoadingSpinner'
import Container from '../components/Container'
import api from '../services/api'
import { BookOpen, CheckCircle, Clock, Play, Award, TrendingUp } from 'lucide-react'

function MyLibrary() {
  const { enrolledCourses, getCourseProgress } = useUserStore()
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadEnrolledCourses = async () => {
      setIsLoading(true)
      try {
        // Load all courses from backend API
        const response = await api.course.getCourses()
        if (response.success) {
          // Filter to only enrolled courses
          const enrolled = response.data.filter(course => enrolledCourses.includes(course.id))
          setCourses(enrolled)
        }
      } catch (error) {
        console.error('Failed to load enrolled courses:', error)
        setCourses([])
      } finally {
        setIsLoading(false)
      }
    }

    loadEnrolledCourses()
  }, [enrolledCourses])

  if (isLoading) {
    return <LoadingSpinner message="Loading your library..." />
  }

  const getProgressStats = () => {
    const total = courses.length
    const completed = courses.filter(course => {
      const progress = getCourseProgress(course.id)
      return progress.progressPercentage === 100
    }).length
    const inProgress = total - completed
    
    return { total, completed, inProgress }
  }

  const stats = getProgressStats()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Container className="py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
            <BookOpen size={32} />
          </div>
          <h1 className="hero-content h1" style={{ color: 'var(--text-primary)' }}>
            My EDUCORE AI Library
          </h1>
          <p className="hero-content subtitle" style={{ color: 'var(--text-secondary)' }}>
            Track your progress and continue your learning journey with all your enrolled courses
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="dashboard-card">
            <div className="dashboard-icon" style={{ background: 'var(--gradient-primary)' }}>
              <BookOpen size={24} />
            </div>
            <h3 style={{ color: 'var(--text-primary)' }}>Total Courses</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{stats.total}</p>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-icon" style={{ background: 'var(--gradient-secondary)' }}>
              <CheckCircle size={24} />
            </div>
            <h3 style={{ color: 'var(--text-primary)' }}>Completed</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{stats.completed}</p>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-icon" style={{ background: 'var(--gradient-accent)' }}>
              <Clock size={24} />
            </div>
            <h3 style={{ color: 'var(--text-primary)' }}>In Progress</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{stats.inProgress}</p>
          </div>
        </div>

        {/* Courses */}
        {courses.length > 0 ? (
          <div className="space-y-6">
            {courses.map(course => {
              const progress = getCourseProgress(course.id)
              const progressPercentage = progress.progressPercentage || 0
              const isCompleted = progressPercentage === 100
              
              return (
                <div key={course.id} className="microservice-card">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Course Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="microservice-card h3 mb-2" style={{ color: 'var(--text-primary)' }}>
                            {course.title}
                          </h3>
                          <p className="microservice-card p mb-3" style={{ color: 'var(--text-secondary)' }}>
                            {course.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <span>{course.instructor || 'Unknown Instructor'}</span>
                            <span>{course.metadata?.duration || 'Unknown Duration'}</span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" style={{ color: 'var(--accent-gold)' }} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {course.rating || 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className={`badge ${course.courseType === 'personalized' ? 'badge-purple' : 'badge-blue'}`}>
                            {course.courseType === 'personalized' ? 'Personalized' : 'Marketplace'}
                          </span>
                          {isCompleted && (
                            <span className="badge badge-green flex items-center gap-1">
                              <Award size={12} />
                              Completed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            Progress
                          </span>
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {progressPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${progressPercentage}%`,
                              background: 'var(--gradient-primary)'
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      <Link
                        to={`/study/${course.id}`}
                        className="btn btn-primary flex items-center gap-2"
                      >
                        <Play size={16} />
                        {isCompleted ? 'Review Course' : 'Continue Learning'}
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
              <BookOpen size={32} />
            </div>
            <h3 className="microservice-card h3 mb-2" style={{ color: 'var(--text-primary)' }}>
              Your library is empty
            </h3>
            <p className="microservice-card p mb-6" style={{ color: 'var(--text-secondary)' }}>
              Start building your learning journey by enrolling in courses from our marketplace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/marketplace"
                className="btn btn-primary"
              >
                Browse Marketplace
              </Link>
              <Link 
                to="/personalized"
                className="btn btn-secondary"
              >
                Get Personalized Courses
              </Link>
            </div>
          </div>
        )}

        {/* Learning Insights */}
        {courses.length > 0 && (
          <div className="microservice-card mt-12" style={{ background: 'var(--gradient-accent)' }}>
            <div className="text-center">
              <div className="service-icon mx-auto mb-4" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
                <TrendingUp size={32} style={{ color: 'white' }} />
              </div>
              <h2 className="microservice-card h3 mb-4" >Keep Up the Great Work!</h2>
              <p className="microservice-card p mb-6" >
                You're making excellent progress on your learning journey. 
                {stats.completed > 0 && ` You've completed ${stats.completed} course${stats.completed !== 1 ? 's' : ''}!`}
              </p>
              <Link 
                to="/marketplace"
                className="btn btn-secondary"
                style={{ background: 'white', color: 'var(--accent-gold)', border: 'none' }}
              >
                Discover More Courses
              </Link>
            </div>
          </div>
        )}
      </Container>
    </div>
  )
}

export default MyLibrary