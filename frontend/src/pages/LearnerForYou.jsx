import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext.jsx'
import Container from '../components/Container.jsx'
import CourseCard from '../components/CourseCard.jsx'


export default function LearnerForYou() {
  const { showToast, userProfile } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 100 })
      const personalised = (data.courses || [])
        .filter((course) => {
          // Primary check: learner_specific course type (personalized courses)
          if (course.course_type === 'learner_specific') {
            return true
          }
          
          // Fallback: check metadata for backward compatibility
          const meta = course.metadata || {}
          return meta.personalized === true || meta.source === 'learner_ai'
        })
        .sort((a, b) => {
          const first = new Date(b.created_at || b.updated_at || Date.now())
          const second = new Date(a.created_at || a.updated_at || Date.now())
          return first - second
        })
      setCourses(personalised)
    } catch (err) {
      showToast('Failed to load personalized recommendations', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])


  if (loading) {
    return (
      <div className="page-surface">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Loading AI recommendations..." />
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="page-surface">
      <Container>
        <div className="stack-lg pt-4">
          <section className="surface-card space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary-cyan)]">
                Personalised journey
              </p>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">Courses curated just for you</h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
                Your personalized learning paths and AI-curated courses.
              </p>
            </div>
          </section>

          <section className="surface-card space-y-6">
            {courses.length === 0 ? (
              <div className="text-center space-y-4">
                <i className="fa-solid fa-sparkles text-3xl text-[var(--primary-cyan)]" aria-hidden="true" />
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  No personalised courses yet
                </h2>
                <p className="text-[var(--text-secondary)]">
                  Generate your first learning path above to see AI-curated courses appear here.
                </p>
              </div>
            ) : (
              <div className="course-grid">
                {courses.map((course) => {
                  const courseId = course.id || course.course_id
                  return (
                    <div key={courseId} className="course-card-enhanced">
                      <CourseCard
                        course={course}
                        to={`/courses/${courseId}?personalized=true`}
                      />
                      <div className="mt-4 flex justify-end">
                        <Link
                          to={`/courses/${courseId}?personalized=true`}
                          className="btn btn-primary btn-sm flex items-center gap-2"
                        >
                          <i className="fa-solid fa-play" />
                          Start Course
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </Container>
    </div>
  )
}

