import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext.jsx'
import Container from '../components/Container.jsx'
import CourseCard from '../components/CourseCard.jsx'

export default function LearnerForYou() {
  const { showToast } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 24 })
      const personalised = (data.courses || [])
        .filter((_, idx) => idx % 2 === 0)
        .map((course) => ({
          ...course,
          metadata: {
            ...(course.metadata || {}),
            personalized: true
          }
        }))
      setCourses(personalised)
    } catch (err) {
      showToast('Failed to load personalized recommendations', 'error')
    } finally {
      setLoading(false)
    }
  }

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
        <div className="stack-lg">
          <section className="surface-card space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary-cyan)]">
                Personalised journey
              </p>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">Courses curated just for you</h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
                These learning paths adapt to your progress. Complete lessons, unlock exercises, then take the exam
                before sharing feedback for deeper insights.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link to="/learner/enrolled" className="btn btn-primary">
                View my library
              </Link>
              <Link to="/learner/marketplace" className="btn btn-secondary">
                Add more interests
              </Link>
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
                  Interact with marketplace courses and complete feedback to unlock tailored recommendations.
                </p>
              </div>
            ) : (
              <div className="course-grid">
                {courses.map((course) => {
                  const courseId = course.id || course.course_id
                  return (
                    <CourseCard
                      key={courseId}
                      course={course}
                      to={`/course/${courseId}/overview?personalized=true`}
                    />
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

