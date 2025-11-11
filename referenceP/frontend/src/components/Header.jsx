import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Moon, Menu, X, User, BookOpen, Home as HomeIcon, ShoppingBag, Sparkles, Library } from 'lucide-react'
import useUserStore from '../store/useUserStore'
import darkLogo from '../../public/logo-dark.png';
import lightLogo from '../../public/logo-light.png';
function Header() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { currentUser, userRole } = useUserStore()

  // Apply theme to document
  useEffect(() => {
    const themeClass = isDarkMode ? 'night-mode' : 'day-mode'
    document.documentElement.className = themeClass
    document.body.className = themeClass
  }, [isDarkMode])

  // Load saved theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
  }

  const getNavigationItems = () => {
    return [
      { href: '/', label: 'Home', icon: HomeIcon },
      { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
      { href: '/personalized', label: 'For You', icon: Sparkles },
      { href: '/library', label: 'My Library', icon: Library }
    ]
  }

  return (
    <>
      {/* Background Animation - Removed particles for cleaner look */}

      {/* Header */}
      <header className="header">
        <div className="nav-container">
          {/* Logo */}
          <Link to="/" className="logo">
            <img 
              src={isDarkMode ? darkLogo : lightLogo} 
              alt="Course Builder" 
            />
            <div className="text-container">
              <span className="brand-name">
                Course Builder
              </span>
              <span className="brand-subtitle">
                by EDUCORE AI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex">
            <ul className="nav-links">
              {getNavigationItems().map((item) => {
                const IconComponent = item.icon
                return (
                  <li key={item.href}>
                    <Link to={item.href}>
                      <IconComponent size={16} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Header Controls */}
          <div className="header-controls">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="theme-toggle"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* User Profile */}
            {currentUser && (
              <div className="user-profile">
                <div className={`user-avatar ${userRole}`}>
                  <User size={20} />
                </div>
                <div className="user-details">
                  <div className="user-name">{currentUser.name}</div>
                  <div className="user-role">{userRole}</div>
                </div>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden theme-toggle"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--bg-tertiary)' }}>
            <nav className="container py-4">
              <ul className="space-y-2">
                {getNavigationItems().map((item) => {
                  const IconComponent = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                        style={{ 
                          color: 'var(--text-primary)',
                        }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <IconComponent size={20} />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}

export default Header
