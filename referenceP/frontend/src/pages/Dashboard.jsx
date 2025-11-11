import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import useCourseStore from '../store/useCourseStore'
import useUserStore from '../store/useUserStore'

function Dashboard() {
  const { courses, fetchCourses, isLoading } = useCourseStore()
  const { userRole, currentUser } = useUserStore()

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <div className="dashboard-container">
        <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <h1 className="section-title" style={{ textAlign: 'left', marginBottom: 'var(--spacing-md)' }}>
            Learning Dashboard 📊
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Track your learning progress and continue your journey
          </p>
        </div>

        {/* Learner Info Banner */}
        <div className="dashboard-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="flex items-start">
            <div className="dashboard-icon">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div style={{ marginLeft: 'var(--spacing-md)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: 'var(--spacing-sm)' }}>Your Learning Journey</h3>
              <div style={{ color: 'var(--text-secondary)' }}>
                <p>Track your progress across personalized learning paths and public courses. 
                Complete lessons, take assessments, and provide feedback to improve your learning experience.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Stats */}
        <div className="dashboard-grid" style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <div className="dashboard-card">
            <div className="flex items-center">
              <div className="dashboard-icon" style={{ background: 'var(--gradient-primary)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div style={{ marginLeft: 'var(--spacing-md)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Courses Enrolled</p>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-cyan)' }}>12</p>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="flex items-center">
              <div className="dashboard-icon" style={{ background: 'var(--gradient-secondary)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div style={{ marginLeft: 'var(--spacing-md)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Completed</p>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-cyan)' }}>8</p>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="flex items-center">
              <div className="dashboard-icon" style={{ background: 'var(--gradient-accent)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div style={{ marginLeft: 'var(--spacing-md)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>In Progress</p>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-cyan)' }}>4</p>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="flex items-center">
              <div className="dashboard-icon" style={{ background: 'var(--gradient-accent)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div style={{ marginLeft: 'var(--spacing-md)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Learning Streak</p>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-cyan)' }}>7 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Paths */}
        <div className="dashboard-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ 
            padding: 'var(--spacing-lg)', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600' }}>
              Learning Paths
            </h2>
          </div>
          
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
              <div style={{
                background: 'var(--gradient-card)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: 'var(--spacing-lg)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600', flex: 1 }}>
                    Frontend Development Path
                  </h3>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    background: 'var(--accent-gold)',
                    color: 'white'
                  }}>
                    65% Complete
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', fontSize: '0.9rem' }}>
                  Personalized learning path based on your skills and goals
                </p>
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Progress</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '500' }}>65%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '65%', height: '100%', background: 'var(--gradient-primary)', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <span>⏱️ 8 weeks</span>
                    <span>•</span>
                    <span>📚 3 courses</span>
                  </div>
                </div>
                <Link to="/path/frontend" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', fontSize: '0.9rem' }}>
                  Continue Learning Path
                </Link>
              </div>

              <div style={{
                background: 'var(--gradient-card)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: 'var(--spacing-lg)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600', flex: 1 }}>
                    React Mastery Path
                  </h3>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    background: 'var(--accent-gold)',
                    color: 'white'
                  }}>
                    30% Complete
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', fontSize: '0.9rem' }}>
                  Advanced React development track
                </p>
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Progress</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '500' }}>30%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '30%', height: '100%', background: 'var(--gradient-secondary)', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <span>⏱️ 6 weeks</span>
                    <span>•</span>
                    <span>📚 2 courses</span>
                  </div>
                </div>
                <Link to="/path/react" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', fontSize: '0.9rem' }}>
                  Continue Learning Path
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card">
          <div style={{ 
            padding: 'var(--spacing-lg)', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600' }}>Recent Activity</h2>
          </div>
          
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--gradient-primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: '500', marginBottom: 'var(--spacing-xs)' }}>
                    Completed React Fundamentals
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>2 hours ago</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--gradient-secondary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: '500', marginBottom: 'var(--spacing-xs)' }}>
                    Started JavaScript Mastery
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>1 day ago</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--gradient-accent)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: '500', marginBottom: 'var(--spacing-xs)' }}>
                    Earned React Basics Badge
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>3 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard