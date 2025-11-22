import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLearnerProgress, getCourses } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext.jsx'
import Container from '../components/Container.jsx'
import CourseCard from '../components/CourseCard.jsx'
import { isMarketplace } from '../utils/courseTypeUtils.js'

export default function LearnerLibrary() {
  const { showToast, userProfile, userRole } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userRole !== 'learner') {
      setCourses([])
      setLoading(false)
      return
    }
    if (userProfile?.id) {
      loadProgress(userProfile.id)
    }
  }, [userProfile?.id, userRole])

  const loadProgress = async (learnerId = userProfile?.id) => {
    if (!learnerId) {
      showToast('Select a learner profile to view your library.', 'info')
      return
    }

    setLoading(true)
    try {
      // Get learner progress data
      const progressData = await getLearnerProgress(learnerId)
      
      // Get full course details for enrolled courses
      const allCoursesData = await getCourses({ limit: 100 })
      const allCourses = allCoursesData.courses || []
      
      // Create a map of course IDs to progress data
      const progressMap = new Map()
      progressData.forEach(progress => {
        progressMap.set(progress.course_id, progress)
      })
      
      // Match enrolled courses with full course data and enrich with progress
      // Filter: ONLY show marketplace courses (manually enrolled)
      // Personalized courses are shown in "For You" page, not here
      const enrolledCourses = allCourses
        .filter(course => {
          const courseId = course.id || course.course_id
          // Must have progress (is enrolled)
          return progressMap.has(courseId)
        })
        // Exclude personalized courses - they belong in "For You" page
        // Only show marketplace courses (course_type === 'trainer')
        .filter(course => isMarketplace(course))
        .map(course => {
          const courseId = course.id || course.course_id
          const progress = progressMap.get(courseId)
          return {
            ...course,
            progress: progress.progress || 0,
            status: progress.status || 'in_progress'
          }
        })
        .sort((a, b) => {
          // Sort by progress (incomplete first), then by updated date
          if (a.progress < 100 && b.progress === 100) return -1
          if (a.progress === 100 && b.progress < 100) return 1
          const first = new Date(b.updated_at || b.created_at || Date.now())
          const second = new Date(a.updated_at || a.created_at || Date.now())
          return first - second
        })
      
      setCourses(enrolledCourses)
    } catch (err) {
      showToast('Failed to load your library', 'error')
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page-surface">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Loading your enrolled courses..." />
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
                My Courses
              </p>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                Your enrolled courses
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
                Resume your learning across all courses you are enrolled in.
              </p>
            </div>
          </section>

          <section className="surface-card space-y-6">
            {courses.length === 0 ? (
              <div className="text-center space-y-4">
                <i className="fa-solid fa-book-open text-3xl text-[var(--primary-cyan)]" aria-hidden="true" />
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  No enrolled courses yet
                </h2>
                <p className="text-[var(--text-secondary)]">
                  Browse the marketplace to enroll in courses and start learning.
                </p>
              </div>
            ) : (
              <div className="course-grid">
                {courses.map((course) => {
                  const courseId = course.id || course.course_id
                  const progress = course.progress || 0
                  const hasProgress = progress > 0
                  const buttonText = hasProgress ? 'Continue Course' : 'Start Course'
                  
                  return (
                    <div key={courseId} className="course-card-enhanced">
                      <CourseCard
                        course={course}
                        to={`/courses/${courseId}`}
                        showProgress={true}
                        progress={progress}
                        isLibrary={true}
                      />
                      <div className="mt-4 flex justify-end">
                        <Link
                          to={`/courses/${courseId}`}
                          className="btn btn-primary btn-sm flex items-center gap-2"
                        >
                          <i className={`fa-solid ${hasProgress ? 'fa-play-circle' : 'fa-play'}`} />
                          {buttonText}
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

