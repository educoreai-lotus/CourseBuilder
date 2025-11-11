import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import useUserStore from '../store/useUserStore'
import api from '../services/api'
import { Star, Clock, Users, Play, Award, BookOpen, CheckCircle, ArrowLeft } from 'lucide-react'

function CourseDetails() {
  const { id } = useParams()
  const { currentUser, enrollInCourse, isEnrolled } = useUserStore()
  const [course, setCourse] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEnrolling, setIsEnrolling] = useState(false)

  useEffect(() => {
    const loadCourse = async () => {
      setIsLoading(true)
      try {
        // Load course from backend API
        const response = await api.course.getCourse(id)
        if (response.success) {
          setCourse(response.data)
        } else {
          throw new Error('Course not found')
        }
      } catch (error) {
        console.error('Failed to load course:', error)
        setCourse(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadCourse()
  }, [id])

  const handleEnroll = async () => {
    if (!currentUser) {
      alert('Please log in to enroll in courses')
      return
    }

    setIsEnrolling(true)
    try {
      // Simulate enrollment API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      enrollInCourse(id)
      alert('Successfully enrolled in course!')
    } catch (error) {
      console.error('Enrollment failed:', error)
      alert('Failed to enroll. Please try again.')
    } finally {
      setIsEnrolling(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading course details..." />
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
            <BookOpen size={32} />
          </div>
          <h2 className="microservice-card h3 mb-2" style={{ color: 'var(--text-primary)' }}>Course Not Found</h2>
          <p className="microservice-card p mb-6" style={{ color: 'var(--text-secondary)' }}>The course you're looking for doesn't exist.</p>
          <Link 
            to="/marketplace"
            className="btn btn-primary"
          >
            Browse Courses
          </Link>
        </div>
      </div>
    )
  }

  const isUserEnrolled = isEnrolled(id)
  const isPersonalized = course.courseType === 'personalized'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="container py-8">
        {/* Back Button */}
        <Link 
          to="/marketplace" 
          className="inline-flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} />
          Back to Marketplace
        </Link>

        {/* Course Header */}
        <div className="microservice-card mb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={`badge ${isPersonalized ? 'badge-purple' : 'badge-blue'}`}>
                  {isPersonalized ? '🎯 Personalized' : '🏪 Marketplace'}
                </span>
                <span className={`badge ${
                  course.metadata?.difficulty === 'beginner' 
                    ? 'badge-green'
                    : course.metadata?.difficulty === 'intermediate'
                    ? 'badge-gold'
                    : 'badge-red'
                }`}>
                  {course.metadata?.difficulty || 'intermediate'}
                </span>
              </div>
              
              <h1 className="hero-content h1 mb-4" style={{ color: 'var(--text-primary)' }}>{course.title}</h1>
              <p className="hero-content p mb-6" style={{ color: 'var(--text-secondary)' }}>{course.description}</p>
              
              <div className="flex items-center space-x-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center">
                  <Users size={16} className="mr-2" />
                  <span className="font-medium">{course.instructor || 'Unknown Instructor'}</span>
                </div>
                <div className="flex items-center">
                  <Clock size={16} className="mr-2" />
                  <span>{course.metadata?.duration || 'Unknown Duration'}</span>
                </div>
                <div className="flex items-center">
                  <Star size={16} className="mr-1" style={{ color: 'var(--accent-gold)' }} />
                  <span className="font-medium">{course.rating || 0}</span>
                  <span className="ml-1">({course.students || 0} students)</span>
                </div>
              </div>
            </div>
            
            <div className="ml-8 text-right">
              {isPersonalized ? (
                <div className="microservice-card" style={{ background: 'var(--gradient-secondary)', color: 'white', padding: 'var(--spacing-md)' }}>
                  <div className="text-2xl font-bold mb-1">Free</div>
                  <div className="text-sm opacity-90">AI-Powered Learning</div>
                </div>
              ) : (
                <div className="text-right">
                  {course.price === 0 ? (
                    <div className="text-2xl font-bold" style={{ color: 'var(--accent-green)' }}>Free</div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>${course.price}</div>
                      {course.price > 0 && (
                        <div className="text-sm line-through" style={{ color: 'var(--text-muted)' }}>${Math.round(course.price * 1.2)}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {isUserEnrolled || isPersonalized ? (
              <Link
                to={`/study/${id}`}
                className="btn btn-primary flex items-center gap-2"
              >
                <Play size={16} />
                {isPersonalized ? 'Start Learning' : 'Continue Learning'}
              </Link>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="btn btn-primary flex items-center gap-2"
              >
                {isEnrolling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enrolling...
                  </>
                ) : (
                  <>
                    <BookOpen size={16} />
                    Enroll Now
                  </>
                )}
              </button>
            )}
            
            <button className="btn btn-secondary">
              Add to Wishlist
            </button>
          </div>
        </div>

        {/* Course Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Overview */}
            <div className="microservice-card">
              <h2 className="microservice-card h3 mb-4" style={{ color: 'var(--text-primary)' }}>Course Overview</h2>
              <div className="prose max-w-none" style={{ color: 'var(--text-secondary)' }}>
                <p>
                  This comprehensive course will take you from beginner to advanced level in {course.metadata?.skills?.[0] || 'the subject'}. 
                  You'll learn through hands-on projects, real-world examples, and interactive exercises.
                </p>
                <p>
                  By the end of this course, you'll have the skills and confidence to build professional-grade applications 
                  and advance your career in the tech industry.
                </p>
              </div>
            </div>

            {/* What You'll Learn */}
            <div className="microservice-card">
              <h2 className="microservice-card h3 mb-4" style={{ color: 'var(--text-primary)' }}>What You'll Learn</h2>
              <ul className="space-y-3">
                {[
                  'Master the fundamentals and advanced concepts',
                  'Build real-world projects and applications',
                  'Learn industry best practices and patterns',
                  'Get hands-on experience with modern tools',
                  'Prepare for technical interviews and assessments'
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Course Curriculum */}
            <div className="microservice-card">
              <h2 className="microservice-card h3 mb-4" style={{ color: 'var(--text-primary)' }}>Course Curriculum</h2>
              <div className="space-y-4">
                {course.topics?.slice(0, 3).map((topic, index) => (
                  <div key={topic.id} className="floating-card">
                    <h3 className="card-title mb-2">{topic.title}</h3>
                    <p className="progress-text mb-3">{topic.description}</p>
                    <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                      <span>{topic.modules?.length || 0} modules</span>
                      <span>{topic.modules?.reduce((acc, module) => acc + (module.lessons?.length || 0), 0) || 0} lessons</span>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8">
                    <BookOpen size={32} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Course curriculum will be available after enrollment</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Stats */}
            <div className="microservice-card">
              <h3 className="microservice-card h3 mb-4" style={{ color: 'var(--text-primary)' }}>Course Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Duration</span>
                  <span style={{ color: 'var(--text-primary)' }}>{course.metadata?.duration || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Level</span>
                  <span style={{ color: 'var(--text-primary)' }}>{course.metadata?.difficulty || 'Intermediate'}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Students</span>
                  <span style={{ color: 'var(--text-primary)' }}>{course.students || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Rating</span>
                  <div className="flex items-center gap-1">
                    <Star size={16} style={{ color: 'var(--accent-gold)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>{course.rating || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills */}
            {course.metadata?.skills && course.metadata.skills.length > 0 && (
              <div className="microservice-card">
                <h3 className="microservice-card h3 mb-4" style={{ color: 'var(--text-primary)' }}>Skills You'll Gain</h3>
                <div className="flex flex-wrap gap-2">
                  {course.metadata.skills.map((skill, index) => (
                    <span key={index} className="badge badge-blue text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructor */}
            <div className="microservice-card">
              <h3 className="microservice-card h3 mb-4" style={{ color: 'var(--text-primary)' }}>Instructor</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{course.instructor || 'Unknown Instructor'}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Expert Instructor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetails