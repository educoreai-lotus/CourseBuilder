import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('day-mode') // 'day-mode' or 'night-mode'
  const [userRole, setUserRole] = useState('learner') // 'learner', 'trainer', 'admin', 'public'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null) // { message, type: 'success' | 'error' }
  
  // Accessibility features
  const [accessibility, setAccessibility] = useState({
    colorblind: false,
    highContrast: false,
    largeFont: false
  })

  useEffect(() => {
    const root = document.documentElement
    root.className = theme
    root.setAttribute('data-theme', theme === 'day-mode' ? 'light' : 'dark')
    
    // Apply accessibility classes
    if (accessibility.colorblind) {
      root.classList.add('colorblind-friendly')
    } else {
      root.classList.remove('colorblind-friendly')
    }
    
    if (accessibility.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
    
    if (accessibility.largeFont) {
      root.classList.add('large-font')
    } else {
      root.classList.remove('large-font')
    }
  }, [theme, accessibility])

  const toggleTheme = () => {
    setTheme(prev => prev === 'day-mode' ? 'night-mode' : 'day-mode')
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const updateAccessibility = (key, value) => {
    setAccessibility(prev => ({ ...prev, [key]: value }))
  }

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme,
    userRole,
    setUserRole,
    loading,
    setLoading,
    error,
    setError,
    toast,
    showToast,
    accessibility,
    updateAccessibility
  }), [theme, userRole, loading, error, toast, accessibility])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
