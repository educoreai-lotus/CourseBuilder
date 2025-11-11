import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import useUserStore from '../store/useUserStore'
import LoadingSpinner from '../components/LoadingSpinner'
import Container from '../components/Container'
import CourseStructure from '../components/CourseStructure'
import api from '../services/api'
import { User, Clock, Award, Play, BookOpen, CheckCircle, ArrowLeft } from 'lucide-react'

function StudyCourse() {
  const { id } = useParams()
  const { currentUser, enrollInCourse, isEnrolled, getCourseProgress, updateCourseProgress } = useUserStore()
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCourseData = async () => {
      setIsLoading(true)
      try {
        // Load course data from backend API
        const courseResponse = await api.course.getCourse(id)
        if (courseResponse.success) {
          setCourse(courseResponse.data)
          
          // Load lessons from backend API
          const lessonsResponse = await api.course.getCourseLessons(id)
          if (lessonsResponse.success) {
            setLessons(lessonsResponse.data)
          }
        }
      } catch (error) {
        console.error('Failed to load course data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCourseData()
  }, [id])

  const handleEnroll = () => {
    if (course) {
      enrollInCourse(course.id)
    }
  }

  const handleLessonComplete = (lessonId) => {
    const progress = getCourseProgress(id)
    const newProgress = Math.min(progress.progressPercentage + (100 / lessons.length), 100)
    updateCourseProgress(id, newProgress, new Date().toISOString())
  }

  const handleTakeExam = () => {
    // Navigate to assessment page
    window.location.href = `/assessment/${id}`
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading course..." />
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <Container>
          <div className="text-center">
            <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
              <BookOpen size={32} />
            </div>
            <h1 className="hero-content h1 mb-4" style={{ color: 'var(--text-primary)' }}>Course Not Found</h1>
            <p className="hero-content p mb-6" style={{ color: 'var(--text-secondary)' }}>The course you're looking for doesn't exist.</p>
            <Link to="/" className="btn btn-primary">
              Go Home
            </Link>
          </div>
        </Container>
      </div>
    )
  }

  const progress = getCourseProgress(id)
  const isEnrolledInCourse = isEnrolled(id)
  const isPersonalized = course.courseType === 'personalized'
  const hasStartedLearning = progress.progressPercentage > 0 || (progress.completedLessons && progress.completedLessons.length > 0)
  
  // Debug logging
  console.log('Course ID:', id)
  console.log('Progress:', progress)
  console.log('Is Enrolled:', isEnrolledInCourse)
  console.log('Has Started Learning:', hasStartedLearning)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Container className="py-8">
        {/* Back Button */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        {/* Course Header */}
        <div className="microservice-card mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="hero-content h1 mb-4" style={{ color: 'var(--text-primary)' }}>{course.title}</h1>
              <p className="hero-content p mb-4" style={{ color: 'var(--text-secondary)' }}>{course.description}</p>
              
              <div className="flex items-center space-x-6 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center">
                  <User size={16} className="mr-2" />
                  {course.instructor || 'Unknown Instructor'}
                </span>
                <span className="flex items-center">
                  <Clock size={16} className="mr-2" />
                  {course.metadata?.duration || 'Unknown Duration'}
                </span>
                <span className="flex items-center">
                  <Award size={16} className="mr-2" />
                  {course.metadata?.difficulty || 'Intermediate'}
                </span>
              </div>
            </div>
            
            <div className="ml-6">
              <span className={`badge ${isPersonalized ? 'badge-purple' : 'badge-blue'}`}>
                {isPersonalized ? 'Personalized' : 'Marketplace'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              <span>Course Progress</span>
              <span>{progress.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${progress.progressPercentage}%`,
                  background: 'var(--gradient-primary)'
                }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isEnrolledInCourse && !isPersonalized ? (
            <div className="text-center py-8">
              <h3 className="microservice-card h3 mb-4" style={{ color: 'var(--text-primary)' }}>Enroll to Start Learning</h3>
              <p className="microservice-card p mb-6" style={{ color: 'var(--text-secondary)' }}>
                Join this course to access all lessons, resources, and assessments.
              </p>
              <button onClick={handleEnroll} className="btn btn-primary">
                Enroll Now
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {isPersonalized ? 'AI-Powered Learning' : 'Enrolled Course'}
              </div>
              <div className="flex gap-3">
                <Link
                  to={`/course/${id}/lesson/${lessons[0]?.id || '1'}`}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Play size={16} />
                  {hasStartedLearning ? 'Continue Learning' : 'Start Learning'}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Course Content */}
        {!isEnrolledInCourse && !isPersonalized ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Course Overview */}
              <div className="microservice-card mb-8">
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

              {/* Learning Objectives */}
              <div className="microservice-card">
                <h2 className="microservice-card h3 mb-4" style={{ color: 'var(--text-primary)' }}>Learning Objectives</h2>
                <ul className="space-y-3">
                  {[
                    'Master the fundamentals and core concepts',
                    'Build real-world projects and applications',
                    'Learn industry best practices and patterns',
                    'Get hands-on experience with modern tools',
                    'Prepare for technical interviews and assessments'
                  ].map((objective, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle size={20} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar - Course Structure */}
            <div className="lg:col-span-1">
              <CourseStructure courseId={id} />
            </div>
          </div>
        ) : (
          /* Course Structure for Enrolled Users */
          <div className="microservice-card">
            <h2 className="microservice-card h3 mb-6" style={{ color: 'var(--text-primary)' }}>Course Structure</h2>
            <CourseStructure courseId={id} />
          </div>
        )}
      </Container>
    </div>
  )
}

export default StudyCourse