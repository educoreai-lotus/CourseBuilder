import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'
import { useRole } from '../hooks/useRole.js'

const learnerLinks = [
  { to: '/learner/dashboard', label: 'Dashboard', icon: 'fa-solid fa-house' },
  { to: '/learner/marketplace', label: 'Marketplace', icon: 'fa-solid fa-store' },
  { to: '/learner/personalized', label: 'For You', icon: 'fa-solid fa-wand-magic-sparkles' },
  { to: '/learner/enrolled', label: 'My Library', icon: 'fa-solid fa-book-open-reader' }
]

const trainerLinks = [
  { to: '/trainer/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chalkboard-user' },
  { to: '/trainer/courses', label: 'Courses', icon: 'fa-solid fa-layer-group' }
]

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useApp()
  const { userRole, switchRole, isLearner, availableRoles } = useRole()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const navItems = isLearner ? learnerLinks : trainerLinks

  const handleRoleChange = (role) => {
    switchRole(role)
    navigate(role === 'trainer' ? '/trainer/dashboard' : '/learner/dashboard', { replace: true })
    setIsMobileMenuOpen(false)
  }

  const renderNavLink = (item) => (
    <li key={item.to}>
      <NavLink
        to={item.to}
        onClick={() => setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          [
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
            isActive
              ? 'bg-[rgba(6,95,70,0.12)] text-[var(--primary-cyan)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--primary-cyan)]'
          ].join(' ')
        }
      >
        <i className={item.icon} aria-hidden="true" />
        <span>{item.label}</span>
      </NavLink>
    </li>
  )

  return (
    <header className="header">
      <div className="nav-container">
        <Link
          to={isLearner ? '/learner/dashboard' : '/trainer/dashboard'}
          className="logo"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img src={theme === 'day-mode' ? logoLight : logoDark} alt="Course Builder" />
          <div className="text-container">
            <span className="brand-name">Course Builder</span>
            <span className="brand-subtitle">Learning Experience Studio</span>
          </div>
        </Link>

        <nav className="hidden md:flex">
          <ul className="nav-links">{navItems.map(renderNavLink)}</ul>
        </nav>

        <div className="header-controls">
          <select
            value={userRole}
            onChange={(event) => handleRoleChange(event.target.value)}
            className="role-selector hidden md:block"
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

          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`} />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--bg-tertiary)' }}>
          <nav className="container py-4">
            <div className="flex flex-col gap-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <i className={item.icon} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ))}

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
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}