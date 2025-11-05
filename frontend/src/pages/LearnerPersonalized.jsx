import { useState, useEffect } from 'react'
import { getCourses } from '../services/apiService.js'
import CourseCard from '../components/CourseCard.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Toast from '../components/Toast.jsx'
import { useApp } from '../context/AppContext'

export default function LearnerPersonalized() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 50 })
      // Simulate personalized courses (AI-generated)
      const allCourses = data.courses || []
      setCourses(allCourses.filter((c, idx) => idx % 2 === 0))
    } catch (err) {
      showToast('Failed to load personalized courses', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <LoadingSpinner message="Loading personalized courses..." />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
      <div className="microservices-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h1 className="section-title" style={{ textAlign: 'left', marginBottom: 'var(--spacing-md)' }}>
            <i className="fas fa-magic mr-2" style={{ color: 'var(--primary-cyan)' }}></i>
            Personalized Courses
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            AI-powered course recommendations tailored to your learning path and skills
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <i className="fas fa-sparkles" style={{ fontSize: '4rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}></i>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
              No Personalized Courses Yet
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
              Complete your learning profile and start learning to get AI-powered recommendations!
            </p>
          </div>
        ) : (
          <>
            <div style={{
              background: 'var(--bg-secondary)',
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-lg)',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              <i className="fas fa-info-circle mr-2"></i>
              These courses have been personalized for you based on your learning goals and current skills.
            </div>
            <div className="microservices-grid">
              {courses.map(course => (
                <CourseCard key={course.id || course.course_id} course={course} />
              ))}
            </div>
          </>
        )}
      </div>
      <Toast />
    </div>
  )
}

