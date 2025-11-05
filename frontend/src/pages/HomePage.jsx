import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Button from '../components/Button'

export default function HomePage() {
  const { theme, userRole } = useApp()

  return (
    <>
      {/* Animated Background */}
      <div className="bg-animation"></div>
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Build and Publish Intelligent Courses
            </h1>
            <p className="subtitle">
              Course Builder transforms learning paths or trainer content into structured, 
              validated courses with AI enrichment. Experience personalized learning 
              powered by Educore AI.
            </p>

            {/* Stats */}
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">4.8</span>
                <span className="stat-label">Average Rating</span>
              </div>
              <div className="stat">
                <span className="stat-number">125+</span>
                <span className="stat-label">Active Courses</span>
              </div>
              <div className="stat">
                <span className="stat-number">2.5K+</span>
                <span className="stat-label">Learners</span>
              </div>
            </div>

            {/* Actions */}
            <div className="hero-actions">
              <Link to="/courses">
                <Button className="btn-primary">
                  <i className="fas fa-book mr-2"></i>
                  Browse Courses
                </Button>
              </Link>
              {userRole === 'trainer' && (
                <Link to="/trainer/dashboard">
                  <Button className="btn-secondary">
                    <i className="fas fa-chalkboard-teacher mr-2"></i>
                    Trainer Dashboard
                  </Button>
                </Link>
              )}
              {userRole === 'learner' && (
                <Link to="/learner/dashboard">
                  <Button className="btn-secondary">
                    <i className="fas fa-user-graduate mr-2"></i>
                    My Dashboard
                  </Button>
                </Link>
              )}
            </div>

            {/* Gamification Preview */}
            <div className="gamification-preview">
              <div className="xp-bar">
                <div className="xp-label">Learning Progress</div>
                <div className="xp-progress">
                  <div className="xp-fill" style={{ width: '75%' }}>
                    <span className="xp-text">75%</span>
                  </div>
                </div>
              </div>
              <div className="achievements">
                <div className="achievement-badge">
                  <i className="fas fa-trophy"></i>
                  <span>Level 5</span>
                </div>
                <div className="achievement-badge">
                  <i className="fas fa-fire"></i>
                  <span>7 Day Streak</span>
                </div>
                <div className="achievement-badge">
                  <i className="fas fa-star"></i>
                  <span>12 Badges</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="hero-visual">
            <div className="floating-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <div className="card-title">AI Course Builder</div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
              <div className="progress-text">Auto-generates modular learning paths</div>
            </div>
          </div>
        </div>
      </section>

      {/* Microservices Section */}
      <section className="microservices-section">
        <div className="microservices-container">
          <h2 className="section-title">Powerful Microservices</h2>
          <div className="microservices-grid">
            <div className="microservice-card">
              <div className="service-icon">
                <i className="fas fa-brain"></i>
              </div>
              <h3>Learner AI</h3>
              <p>Personalized learning paths and skill recommendations</p>
            </div>
            <div className="microservice-card">
              <div className="service-icon">
                <i className="fas fa-palette"></i>
              </div>
              <h3>Content Studio</h3>
              <p>AI-enriched course content and exercises</p>
            </div>
            <div className="microservice-card">
              <div className="service-icon">
                <i className="fas fa-clipboard-check"></i>
              </div>
              <h3>Assessment</h3>
              <p>Comprehensive testing and evaluation</p>
            </div>
            <div className="microservice-card">
              <div className="service-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Learning Analytics</h3>
              <p>Track progress and engagement metrics</p>
            </div>
            <div className="microservice-card">
              <div className="service-icon">
                <i className="fas fa-award"></i>
              </div>
              <h3>Credly</h3>
              <p>Digital badges and micro-credentials</p>
            </div>
            <div className="microservice-card">
              <div className="service-icon">
                <i className="fas fa-search"></i>
              </div>
              <h3>RAG Assistant</h3>
              <p>Contextual knowledge and help</p>
            </div>
          </div>
        </div>
      </section>

      {/* User Type Selection */}
      <section className="user-types">
        <div className="user-types-container">
          <h2 className="section-title">Choose Your Path</h2>
          <div className="user-cards">
            <div className="user-card">
              <div className="user-icon">
                <i className="fas fa-user-graduate"></i>
              </div>
              <h3 className="user-title">Learner</h3>
              <p className="user-description">
                Discover courses, track progress, and earn credentials
              </p>
              <ul className="user-features">
                <li>Personalized learning paths</li>
                <li>Progress tracking</li>
                <li>Digital badges</li>
                <li>Interactive assessments</li>
              </ul>
              <Link to="/courses">
                <Button className="btn-primary" style={{ marginTop: 'var(--spacing-md)' }}>
                  Start Learning
                </Button>
              </Link>
            </div>

            <div className="user-card">
              <div className="user-icon trainer">
                <i className="fas fa-chalkboard-teacher"></i>
              </div>
              <h3 className="user-title">Trainer</h3>
              <p className="user-description">
                Create, validate, and publish AI-enriched courses
              </p>
              <ul className="user-features">
                <li>AI course generation</li>
                <li>Content validation</li>
                <li>Analytics dashboard</li>
                <li>Feedback insights</li>
              </ul>
              <Link to="/trainer/dashboard">
                <Button className="btn-primary" style={{ marginTop: 'var(--spacing-md)' }}>
                  Create Course
                </Button>
              </Link>
            </div>

            <div className="user-card">
              <div className="user-icon organization">
                <i className="fas fa-building"></i>
              </div>
              <h3 className="user-title">Organization</h3>
              <p className="user-description">
                Manage team learning and track training metrics
              </p>
              <ul className="user-features">
                <li>Team management</li>
                <li>Training reports</li>
                <li>Compliance tracking</li>
                <li>Custom branding</li>
              </ul>
              <Button className="btn-secondary" style={{ marginTop: 'var(--spacing-md)' }}>
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
