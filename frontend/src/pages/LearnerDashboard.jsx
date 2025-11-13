import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle, Zap, Award, Sparkles, ShoppingBag, Play } from 'lucide-react'
import { getCourses, getLearnerProgress } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Container from '../components/Container.jsx'
import { useApp } from '../context/AppContext'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default function LearnerDashboard() {
  const { showToast, userProfile } = useApp()
  const [recommended, setRecommended] = useState([])
  const [continueLearning, setContinueLearning] = useState([])
  const [trendingTopics, setTrendingTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [userProfile?.id])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      // Load recommended courses from marketplace
      const coursesData = await getCourses({ limit: 12 })
      const allCourses = coursesData.courses || []
      setRecommended(allCourses.slice(0, 6))

      // Load REAL enrolled courses with progress
      if (userProfile?.id) {
        try {
          const progressData = await getLearnerProgress(userProfile.id)
          const enrolledCourses = progressData.map(course => ({
            id: course.course_id,
            course_id: course.course_id,
            title: course.title,
            progress: course.progress || 0,
            status: course.status,
            level: course.level,
            rating: course.rating,
            lastTouched: course.enrolled_at 
              ? dayjs(course.enrolled_at).fromNow()
              : 'Recently'
          }))
          setContinueLearning(enrolledCourses)
        } catch (progressErr) {
          console.error('Failed to load progress:', progressErr)
          setContinueLearning([])
        }
      } else {
        setContinueLearning([])
      }

      // Generate trending topics from available courses
      const topicsMap = new Map()
      allCourses.forEach(course => {
        const category = course.category || course.level || 'General'
        if (!topicsMap.has(category)) {
          topicsMap.set(category, {
            topic: category,
            learners: course.total_enrollments || 0,
            momentum: 'up'
          })
        } else {
          const existing = topicsMap.get(category)
          existing.learners += course.total_enrollments || 0
        }
      })
      setTrendingTopics(Array.from(topicsMap.values()).slice(0, 6))
    } catch (err) {
      showToast('Failed to load your learner dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  const emptyState = useMemo(
    () => recommended.length === 0 && continueLearning.length === 0,
    [recommended, continueLearning]
  )

  const enrolledCount = continueLearning.length
  const completedCount = continueLearning.filter((course) => course.progress >= 90).length

  if (loading) {
    return (
      <div className="dashboard-surface">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Loading your learning hub..." />
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="dashboard-surface">
      <Container>
        <div className="stack-xl">
          <section className="hero-spotlight text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[var(--primary-cyan)]">Learner HQ</p>
            <h1 className="text-4xl font-bold text-[var(--text-primary)]">
              Welcome back, {userProfile?.name || 'Learner'}!
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              Continue your learning journey and discover new skills curated just for you.
            </p>
          </section>

          <section className="metrics-band">
            <div className="metric-card">
              <div className="metric-icon">
                <BookOpen size={22} />
              </div>
              <span className="metric-label">Enrolled courses</span>
              <strong className="metric-value">{enrolledCount}</strong>
            </div>
            <div className="metric-card">
              <div className="metric-icon accent-secondary">
                <CheckCircle size={22} />
              </div>
              <span className="metric-label">Completed</span>
              <strong className="metric-value">{completedCount}</strong>
            </div>
            <div className="metric-card">
              <div className="metric-icon accent-amber">
                <Zap size={22} />
              </div>
              <span className="metric-label">Learning streak</span>
              <strong className="metric-value">7 days</strong>
            </div>
            <div className="metric-card">
              <div className="metric-icon accent-primary">
                <Award size={22} />
              </div>
              <span className="metric-label">Achievements</span>
              <strong className="metric-value">12</strong>
            </div>
          </section>

          {emptyState ? (
            <section className="surface-card soft text-center">
              <Sparkles size={36} className="mx-auto text-[var(--primary-cyan)]" />
              <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">Ready to start exploring?</h2>
              <p className="mt-2 text-[var(--text-secondary)]">
                Build your learner profile by visiting the marketplace and saving courses to your library.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/learner/marketplace" className="btn btn-primary">
                  Browse marketplace
                </Link>
                <Link to="/learner/personalized" className="btn btn-secondary">
                  Get recommendations
                </Link>
              </div>
            </section>
          ) : (
            <>
              <section className="spotlight-grid">
                <article className="microservice-card refined">
                  <div className="spotlight-header">
                    <div className="service-icon" style={{ background: 'var(--gradient-secondary)' }}>
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <h2 className="card-title">Personalized learning</h2>
                      <p className="progress-text">AI-powered recommendations tailored to your goals</p>
                    </div>
                  </div>
                  <div className="stack-md">
                    {recommended.slice(0, 3).map((course) => (
                      <div key={course.id || course.course_id} className="course-card compact">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="card-title text-base">{course.title || course.course_name}</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {course.description ||
                                course.course_description ||
                                'Build practical skills with guided lessons and projects.'}
                            </p>
                          </div>
                          <span className="badge badge-purple">Personalized</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                          <span>{course.duration ? `${course.duration} mins` : 'Approx. 45 mins'}</span>
                          <Link
                            to={`/courses/${course.id || course.course_id}`}
                            className="btn btn-primary flex items-center gap-2 text-xs"
                          >
                            <Play size={14} />
                            Start learning
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="microservice-card refined">
                  <div className="spotlight-header">
                    <div className="service-icon" style={{ background: 'var(--gradient-primary)' }}>
                      <ShoppingBag size={22} />
                    </div>
                    <div>
                      <h2 className="card-title">Marketplace</h2>
                      <p className="progress-text">Discover courses from expert instructors</p>
                    </div>
                  </div>
                  <div className="stack-md">
                    {recommended.slice(3, 6).map((course) => (
                      <div key={`market-${course.id || course.course_id}`} className="course-card compact">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="card-title text-base">{course.title || course.course_name}</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {course.description ||
                                course.course_description ||
                                'Learn from specialists with real-world experience.'}
                            </p>
                          </div>
                          <span className="badge badge-blue">Marketplace</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                          <span>{(course.rating || course.average_rating || 4.6).toFixed(1)} rating</span>
                          <Link to={`/courses/${course.id || course.course_id}`} className="btn btn-secondary text-xs">
                            View details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="stats-row">
                <article className="dashboard-panel">
                  <div className="section-heading">
                    <div>
                      <h2>Continue learning</h2>
                      <p>Pick up where you left off last session.</p>
                    </div>
                    <Link to="/learner/enrolled" className="action-link">
                      View all <i className="fa-solid fa-arrow-right" />
                    </Link>
                  </div>

                  <div className="stack-md">
                    {continueLearning.slice(0, 4).map((course) => (
                      <div key={course.id || course.course_id} className="course-card compact">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                              {course.title || course.course_name}
                            </h3>
                            <p className="text-xs text-[var(--text-muted)]">Last opened {course.lastTouched}</p>
                          </div>
                          <Link
                            to={`/courses/${course.id || course.course_id}`}
                            className="btn btn-primary text-xs"
                            style={{ padding: '10px 18px' }}
                          >
                            Resume
                          </Link>
                        </div>
                        <div className="progress-track mt-4">
                          <span className="progress-fill" style={{ width: `${course.progress}%` }} />
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-[var(--text-muted)]">
                          <span>{course.progress}% completed</span>
                          <span>{course.modules?.[0]?.lessons?.length || 8} lessons</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <aside className="dashboard-panel">
                  <div className="section-heading">
                    <div>
                      <h2>Trending topics</h2>
                      <p>Communities growing in the last 7 days.</p>
                    </div>
                  </div>
                  <div className="stack-md">
                    {trendingTopics.map((topic) => (
                      <div key={topic.topic} className="course-card compact">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{topic.topic}</p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {topic.learners.toLocaleString()} learners this week
                            </p>
                          </div>
                          <span
                            className="status-chip"
                            style={{
                              background:
                                topic.momentum === 'up' ? 'rgba(34,197,94,0.12)' : 'rgba(14,165,233,0.12)',
                              color: topic.momentum === 'up' ? '#047857' : '#0f766e'
                            }}
                          >
                            <i className={`fa-solid ${topic.momentum === 'up' ? 'fa-arrow-trend-up' : 'fa-arrow-right'}`} />
                            {topic.momentum === 'up' ? 'Growing' : 'Steady'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              </section>

              <section className="microservice-card cta">
                <div className="text-center text-white">
                  <h2 className="card-title mb-4 text-white">Ready to start learning?</h2>
                  <p className="progress-text mb-6 text-white/90">
                    Choose your learning path and begin your journey to mastery.
                  </p>
                  <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link to="/learner/marketplace" className="btn btn-secondary" style={{ background: 'white', color: 'var(--primary-blue)', border: 'none' }}>
                      Browse marketplace
                    </Link>
                    <Link to="/learner/personalized" className="btn btn-secondary" style={{ background: 'var(--accent-gold)', color: 'white', border: 'none' }}>
                      Get personalized
                    </Link>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </Container>
    </div>
  )
}

