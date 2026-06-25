import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback
} from 'react'

const AppContext = createContext(null)

const ROLE_STORAGE_KEY = 'coursebuilder:userRole'
const allowedRoles = ['learner', 'trainer']

const EMPTY_PROFILE = {
  id: null,
  directoryUserId: null,
  userId: null,
  name: null,
  email: null,
  company: null,
  avatar: null,
  primaryRole: '',
  isTrainer: false,
  isSystemAdmin: false,
  authenticated: false
}

const getStoredRole = () => {
  if (typeof window === 'undefined') {
    return 'learner'
  }
  const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY)
  return storedRole && allowedRoles.includes(storedRole) ? storedRole : 'learner'
}

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('day-mode')
  const [userRole, setUserRoleState] = useState(getStoredRole)
  const [userProfile, setUserProfileState] = useState(EMPTY_PROFILE)
  const [identityReady, setIdentityReady] = useState(false)
  const [identityLoading, setIdentityLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const [accessibility, setAccessibility] = useState({
    colorblind: false,
    highContrast: false,
    largeFont: false
  })

  useEffect(() => {
    const root = document.documentElement
    root.className = theme
    root.setAttribute('data-theme', theme === 'day-mode' ? 'light' : 'dark')

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

  const setUserProfile = useCallback((profile) => {
    setUserProfileState(profile)
  }, [])

  const setUserRole = useCallback((role) => {
    const normalizedRole = allowedRoles.includes(role) ? role : 'learner'
    setUserRoleState(normalizedRole)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROLE_STORAGE_KEY, normalizedRole)
    }
  }, [])

  useEffect(() => {
    if (!allowedRoles.includes(userRole)) {
      setUserRole('learner')
    }
  }, [userRole, setUserRole])

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
    userProfile,
    setUserProfile,
    identityReady,
    setIdentityReady,
    identityLoading,
    setIdentityLoading,
    accessibility,
    updateAccessibility
  }), [
    theme,
    userRole,
    loading,
    error,
    toast,
    userProfile,
    identityReady,
    identityLoading,
    accessibility,
    setUserProfile,
    setUserRole
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
