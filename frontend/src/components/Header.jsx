import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useRole } from '../hooks/useRole.js'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'

export default function Header() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useApp()
  const { userRole, switchRole, isLearner, isTrainer, availableRoles } = useRole()
  const [isMenuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const logo = theme === 'day-mode' ? logoLight : logoDark

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    // Redirect base url to the correct dashboard when role changes
    if (typeof window !== 'undefined') {
      navigate(userRole === 'trainer' ? '/trainer/dashboard' : '/learner/dashboard', { replace: true })
    }
  }, [userRole, navigate])

  const learnerNav = [
    { to: '/learner/dashboard', label: 'Home', icon: 'fa-solid fa-house' },
    { to: '/learner/marketplace', label: 'Marketplace', icon: 'fa-solid fa-store' },
    { to: '/learner/for-you', label: 'For You', icon: 'fa-solid fa-wand-magic-sparkles' },
    { to: '/learner/library', label: 'My Library', icon: 'fa-solid fa-book-open-reader' }
  ]

  const trainerNav = [
    { to: '/trainer/dashboard', label: 'Home', icon: 'fa-solid fa-chalkboard-user' },
    { to: '/trainer/courses', label: 'Courses', icon: 'fa-solid fa-layer-group' }
  ]

  const navLinks = isLearner ? learnerNav : trainerNav

  return (
    <header className="fixed top-0 w-full z-50">
      <nav className="flex w-full items-center justify-between bg-white/70 backdrop-blur-lg shadow-md px-4 md:px-8 py-4 dark:bg-slate-900/70 dark:shadow-slate-900/40">
        <Link
          to={userRole === 'trainer' ? '/trainer/dashboard' : '/learner/dashboard'}
          className="flex items-center gap-3 group"
        >
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Educore AI Logo"
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <span className="hidden font-bold text-xl text-indigo-600 md:inline-block dark:text-indigo-300">
              Course Builder
            </span>
          </div>
        </Link>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-600 shadow-sm transition md:hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
        >
          <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-bars'} text-lg`} />
        </button>

        <div
          id="primary-navigation"
          className={`${
            isMenuOpen ? 'flex' : 'hidden'
          } absolute left-0 right-0 top-[72px] flex-col gap-4 bg-white/95 px-4 py-6 shadow-xl md:static md:flex md:flex-row md:items-center md:gap-6 md:bg-transparent md:p-0 md:shadow-none dark:bg-slate-900/95`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                    'hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10',
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-600 shadow-sm dark:bg-indigo-500/20 dark:text-indigo-200'
                      : 'text-slate-600 dark:text-slate-300'
                  ].join(' ')
                }
                onClick={() => setMenuOpen(false)}
              >
                <i className={`${link.icon} text-base`} />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:gap-3 md:border-none md:pt-0 dark:border-slate-700">
            <div className="flex items-center gap-3 rounded-2xl bg-white/50 px-3 py-2 shadow-sm backdrop-blur dark:bg-slate-800/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow">
                <i className={`fa-solid ${isTrainer ? 'fa-user-tie' : 'fa-user-graduate'} text-lg`} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Active Mode
                </span>
                <span className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                  {userRole}
                </span>
              </div>
            </div>

            <select
              value={userRole}
              onChange={(e) => switchRole(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:focus:border-indigo-300"
            >
              {availableRoles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm transition hover:scale-105 hover:text-indigo-600 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:text-indigo-200"
              aria-label={`Switch to ${theme === 'day-mode' ? 'night' : 'day'} mode`}
            >
              <i className={`fa-solid ${theme === 'day-mode' ? 'fa-moon' : 'fa-sun'} text-lg`} />
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
