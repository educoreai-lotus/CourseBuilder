import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react'

const AppContext = createContext(null)

const ROLE_STORAGE_KEY = 'coursebuilder:userRole'
const allowedRoles = ['learner', 'trainer']

const roleProfiles = {
  learner: {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Alice Learner',
    email: 'alice.learner@example.com',
    company: 'Emerald Learning',
    avatar: 'AL'
  },
  trainer: {
    id: '20000000-0000-0000-0000-000000000001',
    name: 'Tristan Trainer',
    email: 'tristan.trainer@example.com',
    company: 'Emerald Learning',
    avatar: 'TT'
  }
}

const getStoredRole = () => {
  if (typeof window === 'undefined') {
    return 'learner'
  }
  const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY)
  return storedRole && allowedRoles.includes(storedRole) ? storedRole : 'learner'
}

const getProfileForRole = (role) => roleProfiles[role] || roleProfiles.learner

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('day-mode') // 'day-mode' or 'night-mode'
  const [userRole, setUserRoleState] = useState(getStoredRole)
  const [userProfile, setUserProfileState] = useState(() => getProfileForRole(getStoredRole()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null) // { message, type: 'success' | 'error' | 'info' }
  const pendingUserIdRef = useRef(null) // Store userId from URL to apply after role is set
  
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

  const setUserProfile = useCallback((profile) => {
    setUserProfileState(profile)
  }, [])

  const setUserRole = useCallback((role) => {
    const normalizedRole = allowedRoles.includes(role) ? role : 'learner'
    setUserRoleState(normalizedRole)
    setUserProfileState(roleProfiles[normalizedRole])
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROLE_STORAGE_KEY, normalizedRole)
    }
  }, [])

  useEffect(() => {
    // Normalize any legacy roles to supported ones
    if (!allowedRoles.includes(userRole)) {
      setUserRole('learner')
    }
  }, [userRole, setUserRole])

  useEffect(() => {
    const fallbackRole = allowedRoles.includes(userRole) ? userRole : 'learner'
    setUserProfileState(getProfileForRole(fallbackRole))
  }, [userRole])

  // Handle userId from URL query parameters
  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    const userIdFromUrl = urlParams.get('userId')

    if (userIdFromUrl) {
      // Store userId to apply after role is set
      pendingUserIdRef.current = userIdFromUrl
      
      // Set role to learner if userId is provided (since it's typically for learner dashboard)
      const currentRole = getStoredRole()
      if (currentRole !== 'learner') {
        setUserRole('learner')
      } else {
        // If role is already learner, apply userId immediately
        setUserProfileState(prev => ({
          ...prev,
          id: userIdFromUrl
        }))
        pendingUserIdRef.current = null
      }

      // Clean up URL by removing userId parameter (optional - keeps URL clean)
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('userId')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [setUserRole, setUserProfileState]) // Run once on mount

  // Apply pending userId after role is set to learner
  useEffect(() => {
    if (pendingUserIdRef.current && userRole === 'learner') {
      setUserProfileState(prev => ({
        ...prev,
        id: pendingUserIdRef.current
      }))
      pendingUserIdRef.current = null
    }
  }, [userRole, setUserProfileState])

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
    accessibility,
    updateAccessibility
  }), [theme, userRole, loading, error, toast, userProfile, accessibility, setUserProfile])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
