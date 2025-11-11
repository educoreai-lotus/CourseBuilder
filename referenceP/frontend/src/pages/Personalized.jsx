import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CourseCard from '../components/CourseCard'
import LoadingSpinner from '../components/LoadingSpinner'
import Container from '../components/Container'
import api from '../services/api'
import { Sparkles, Brain, Target, Zap } from 'lucide-react'

function Personalized() {
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCourses = async () => {
      setIsLoading(true)
      try {
        // Load courses from backend API
        const response = await api.course.getCourses()
        if (response.success) {
          // Filter only personalized courses
          const personalizedCourses = response.data.filter(course => course.courseType === 'personalized')
          setCourses(personalizedCourses)
        }
      } catch (error) {
        console.error('Failed to load personalized courses:', error)
        setCourses([])
      } finally {
        setIsLoading(false)
      }
    }

    loadCourses()
  }, [])

  if (isLoading) {
    return <LoadingSpinner message="Loading your personalized courses..." />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Container className="py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-secondary)' }}>
            <Sparkles size={32} />
          </div>
          <h1 className="hero-content h1" style={{ color: 'var(--text-primary)' }}>
            EDUCORE AI Personalized Learning
          </h1>
          <p className="hero-content subtitle" style={{ color: 'var(--text-secondary)' }}>
            AI-powered courses tailored specifically for your learning goals, 
            skill level, and career aspirations. Start learning immediately without enrollment.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="microservice-card text-center">
            <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
              <Brain size={24} />
            </div>
            <h3 className="microservice-card h3 mb-2" style={{ color: 'var(--text-primary)' }}>
              AI-Powered
            </h3>
            <p className="microservice-card p" style={{ color: 'var(--text-secondary)' }}>
              Advanced algorithms analyze your learning patterns and adapt content accordingly
            </p>
          </div>

          <div className="microservice-card text-center">
            <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-accent)' }}>
              <Target size={24} />
            </div>
            <h3 className="microservice-card h3 mb-2" style={{ color: 'var(--text-primary)' }}>
              Goal-Oriented
            </h3>
            <p className="microservice-card p" style={{ color: 'var(--text-secondary)' }}>
              Courses designed around your specific career objectives and skill gaps
            </p>
          </div>

          <div className="microservice-card text-center">
            <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-secondary)' }}>
              <Zap size={24} />
            </div>
            <h3 className="microservice-card h3 mb-2" style={{ color: 'var(--text-primary)' }}>
              Instant Access
            </h3>
            <p className="microservice-card p" style={{ color: 'var(--text-secondary)' }}>
              No enrollment required - start learning immediately with your personalized curriculum
            </p>
          </div>
        </div>

        {/* Courses */}
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                showEnrollButton={true}
                isPersonalized={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-secondary)' }}>
              <Sparkles size={32} />
            </div>
            <h3 className="microservice-card h3 mb-2" style={{ color: 'var(--text-primary)' }}>
              No personalized courses yet
            </h3>
            <p className="microservice-card p mb-6" style={{ color: 'var(--text-secondary)' }}>
              Complete your learning profile to get AI-powered course recommendations tailored just for you.
            </p>
            <Link 
              to="/marketplace"
              className="btn btn-primary"
            >
              Browse Marketplace Courses
            </Link>
          </div>
        )}

        {/* Call to Action */}
        <div className="microservice-card mt-12" style={{ background: 'var(--gradient-secondary)' }}>
          <div className="text-center">
            <h2 className="microservice-card h3 mb-4" >Want More Personalization?</h2>
            <p className="microservice-card p mb-6" >
              Complete your learning profile to unlock more AI-powered course recommendations
            </p>
            <button className="btn btn-secondary" >
              Complete Profile
            </button>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default Personalized