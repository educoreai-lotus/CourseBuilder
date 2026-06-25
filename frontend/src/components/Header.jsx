import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'
import { useAuth } from '../auth/AuthContext.jsx'
import { logout } from '../auth/logout.js'

const learnerLinks = [
  { to: '/learner/dashboard', label: 'Dashboard', icon: 'fa-solid fa-house' },
  { to: '/learner/marketplace', label: 'Marketplace', icon: 'fa-solid fa-store' },
  { to: '/learner/personalized', label: 'For You', icon: 'fa-solid fa-wand-magic-sparkles' },
  { to: '/learner/enrolled', label: 'My Library', icon: 'fa-solid fa-book-open-reader' }
]

export default function Header() {
  const location = useLocation()
  const { theme, toggleTheme } = useApp()
  const { isAuthenticated } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
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
    <header className="sticky top-0 z-[1030] h-16 md:h-[64px] bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-700 shadow-sm">
      <div className="container mx-auto px-4 md:px-6 h-full flex items-center justify-between">
        <Link
          to="/learner/dashboard"
          className="flex items-center gap-3"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <img src={theme === 'day-mode' ? logoLight : logoDark} alt="Course Builder" className="h-10 w-auto" />
          <div className="hidden sm:flex flex-col">
            <span className="text-neutral-900 dark:text-neutral-50 font-semibold leading-5">Course Builder</span>
            <span className="text-neutral-500 dark:text-neutral-300 text-xs leading-4">Learning Experience Studio</span>
          </div>
        </Link>

        <nav className="hidden md:flex">
          <ul className="flex items-center gap-2">{learnerLinks.map(renderNavLink)}</ul>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="hidden md:inline-flex items-center justify-center rounded-button px-3 py-2 text-sm font-semibold text-neutral-700 hover:text-brand-primary dark:text-neutral-200 disabled:opacity-50"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-button p-2 text-neutral-600 hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary dark:text-neutral-300"
            aria-label={`Switch to ${theme === 'day-mode' ? 'night' : 'day'} theme`}
          >
            <i className={`fa-solid ${theme === 'day-mode' ? 'fa-moon' : 'fa-sun'}`} />
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-button p-2 md:hidden text-neutral-700 dark:text-neutral-200"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`} />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-surface-dark border-t border-neutral-200 dark:border-neutral-700">
          <nav className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-3">
              {learnerLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  <i className={item.icon} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ))}

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center justify-center px-4 py-3 rounded-lg text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
