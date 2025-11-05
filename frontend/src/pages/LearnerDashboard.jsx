import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import CourseCard from '../components/CourseCard.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext'

export default function LearnerDashboard() {
  const { showToast } = useApp()
  const [personalizedCourses, setPersonalizedCourses] = useState([])
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      // Fetch all courses - in real app, these would be filtered by personalized/enrolled
      const data = await getCourses({ limit: 20 })
      const courses = data.courses || []
      
      // Simulate personalized courses (AI-generated for learner)
      setPersonalizedCourses(courses.filter((c, idx) => idx % 2 === 0).slice(0, 3))
      
      // Simulate enrolled courses with progress
      setEnrolledCourses(courses.slice(0, 5).map(course => ({
        ...course,
        progress: Math.floor(Math.random() * 100) // Mock progress
      })))
    } catch (err) {
      showToast('Failed to load courses', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <LoadingSpinner message="Loading your dashboard..." />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
      <div className="microservices-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 className="section-title" style={{ textAlign: 'left', marginBottom: 'var(--spacing-xl)' }}>
          My Learning Dashboard
        </h1>

        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary-cyan)', marginBottom: 'var(--spacing-xs)' }}>
              {enrolledCourses.length}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Enrolled Courses</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary-cyan)', marginBottom: 'var(--spacing-xs)' }}>
              {personalizedCourses.length}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Personalized Courses</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary-cyan)', marginBottom: 'var(--spacing-xs)' }}>
              {Math.round(enrolledCourses.reduce((acc, c) => acc + (c.progress || 0), 0) / enrolledCourses.length || 0)}%
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Avg Progress</div>
          </div>
        </div>

        {/* Personalized Courses Section */}
        <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              <i className="fas fa-magic mr-2" style={{ color: 'var(--primary-cyan)' }}></i>
              Personalized for You
            </h2>
            <Link to="/learner/personalized">
              <button className="btn btn-secondary">
                View All <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </Link>
          </div>
          {personalizedCourses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
              <i className="fas fa-sparkles" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}></i>
              <p style={{ color: 'var(--text-secondary)' }}>No personalized courses yet. Complete your learning profile to get AI recommendations!</p>
            </div>
          ) : (
            <div className="microservices-grid">
              {personalizedCourses.map(course => (
                <CourseCard key={course.id || course.course_id} course={course} />
              ))}
            </div>
          )}
        </div>

        {/* Enrolled Courses Section */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              <i className="fas fa-book-open mr-2" style={{ color: 'var(--primary-cyan)' }}></i>
              My Enrolled Courses
            </h2>
            <Link to="/learner/enrolled">
              <button className="btn btn-secondary">
                View All <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </Link>
          </div>
          {enrolledCourses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
              <i className="fas fa-book" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}></i>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                You haven't enrolled in any courses yet.
              </p>
              <Link to="/courses">
                <button className="btn btn-primary">
                  Browse Courses
                </button>
              </Link>
            </div>
          ) : (
            <div className="microservices-grid">
              {enrolledCourses.map(course => (
                <CourseCard 
                  key={course.id || course.course_id} 
                  course={course}
                  showProgress={true}
                  progress={course.progress}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Toast />
    </div>
  )
}

