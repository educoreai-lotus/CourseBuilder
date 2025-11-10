import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'
import { useRole } from '../hooks/useRole.js'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme, userProfile } = useApp()
  const { userRole, switchRole, isLearner, isTrainer, availableRoles } = useRole()
  const [isMenuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const learnerNav = [
    { to: '/learner/dashboard', label: 'Dashboard', icon: 'fa-solid fa-house' },
    { to: '/learner/marketplace', label: 'Marketplace', icon: 'fa-solid fa-store' },
    { to: '/learner/personalized', label: 'Personalized', icon: 'fa-solid fa-wand-magic-sparkles' },
    { to: '/learner/enrolled', label: 'Enrolled', icon: 'fa-solid fa-book-open-reader' }
  ]

  const trainerNav = [
    { to: '/trainer/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chalkboard-user' },
    { to: '/trainer/courses', label: 'Courses', icon: 'fa-solid fa-layer-group' }
  ]

  const navLinks = isLearner ? learnerNav : trainerNav

  const handleRoleChange = (role) => {
    switchRole(role)
    navigate(role === 'trainer' ? '/trainer/dashboard' : '/learner/dashboard', { replace: true })
    setMenuOpen(false)
  }

  return (
    <header className="header">
      <div className="nav-container">
        <Link
          to={isLearner ? '/learner/dashboard' : '/trainer/dashboard'}
          className="logo"
          onClick={() => setMenuOpen(false)}
        >
          <img
            src={theme === 'day-mode' ? logoLight : logoDark}
            alt="Course Builder logo"
            style={{ height: '34px', width: 'auto' }}
          />
        </Link>

        <div className="user-info">
          <span className="user-name">{userProfile?.name || (isLearner ? 'Learner mode' : 'Trainer mode')}</span>
          <span className="user-role">
            {isLearner ? 'Personalized learning' : 'Course operations'}
            {userProfile?.company ? ` · ${userProfile.company}` : ''}
          </span>
        </div>

        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-bars'}`} />
        </button>

        <nav className={`nav-links ${isMenuOpen ? 'nav-open' : ''}`} aria-label="Primary navigation">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                [
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                  isActive
                    ? 'bg-[rgba(6,95,70,0.1)] text-[var(--primary-cyan)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--primary-cyan)]'
                ].join(' ')
              }
            >
              <i className={link.icon} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={`header-controls ${isMenuOpen ? 'nav-open' : ''}`}>
          <div className="user-profile">
            <div className={`user-avatar ${isTrainer ? 'trainer' : 'learner'}`}>
              {userProfile?.avatar ? (
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{userProfile.avatar}</span>
              ) : (
                <i className={`fa-solid ${isTrainer ? 'fa-user-tie' : 'fa-user-graduate'}`} />
              )}
            </div>
            <div className="user-details">
              <span className="user-name">{userProfile?.name || 'Active mode'}</span>
              <span className="user-role" style={{ textTransform: 'capitalize' }}>{userRole}</span>
            </div>
          </div>

          <select
            value={userRole}
            onChange={(event) => handleRoleChange(event.target.value)}
            className="role-selector"
            aria-label="Switch workspace role"
          >
            {availableRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={`Switch to ${theme === 'day-mode' ? 'night' : 'day'} theme`}
          >
            <i className={`fa-solid ${theme === 'day-mode' ? 'fa-moon' : 'fa-sun'}`} />
          </button>
        </div>
      </div>
    </header>
  )
}