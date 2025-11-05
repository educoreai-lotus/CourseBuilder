import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Header() {
  const { theme, toggleTheme, userRole, setUserRole } = useApp()
  
  const logo = theme === 'day-mode' 
    ? '/src/assets/logo-light.png' 
    : '/src/assets/logo-dark.png'

  return (
    <header className="header">
      <div className="nav-container">
        <Link to="/" className="logo">
          <img 
            src={logo} 
            alt="Educore AI Logo" 
            className="h-8 mr-3"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'block'
            }}
          />
          <span style={{ display: 'none' }}>Educore AI</span>
          <span className="text-xl font-bold" style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Course Builder
          </span>
        </Link>

        <nav className="nav-links">
          <Link to="/courses">
            <i className="fas fa-book"></i>
            Courses
          </Link>
          {userRole === 'learner' && (
            <>
              <Link to="/learner/dashboard">
                <i className="fas fa-user-graduate"></i>
                My Dashboard
              </Link>
              <Link to="/learner/personalized">
                <i className="fas fa-magic"></i>
                Personalized
              </Link>
            </>
          )}
          {userRole === 'trainer' && (
            <Link to="/trainer/dashboard">
              <i className="fas fa-chalkboard-teacher"></i>
              Trainer Dashboard
            </Link>
          )}
          {userRole === 'admin' && (
            <Link to="/admin/dashboard">
              <i className="fas fa-cog"></i>
              Admin
            </Link>
          )}
        </nav>

        <div className="header-controls">
          {/* User Profile */}
          <div className="user-profile">
            <div className={`user-avatar ${userRole}`}>
              {userRole === 'learner' && <i className="fas fa-user-graduate"></i>}
              {userRole === 'trainer' && <i className="fas fa-chalkboard-teacher"></i>}
              {userRole === 'admin' && <i className="fas fa-user-shield"></i>}
              {userRole === 'public' && <i className="fas fa-user"></i>}
            </div>
            <div className="user-details">
              <div className="user-name">User</div>
              <div className="user-role">{userRole}</div>
            </div>
          </div>

          {/* Role Selector */}
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            className="bg-bg-secondary border border-border-muted rounded-md px-2 py-1 text-text-primary text-sm"
            style={{ 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--bg-tertiary)',
              color: 'var(--text-primary)',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <option value="learner">Learner</option>
            <option value="trainer">Trainer</option>
            <option value="admin">Admin</option>
            <option value="public">Public</option>
          </select>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={`Switch to ${theme === 'day-mode' ? 'night' : 'day'} mode`}
          >
            {theme === 'day-mode' ? (
              <i className="fas fa-moon"></i>
            ) : (
              <i className="fas fa-sun"></i>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
