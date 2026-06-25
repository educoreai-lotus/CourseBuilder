import { useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { fetchAuthContext } from '../services/apiService.js'
import { mapAuthContextToProfile, mapAuthContextToUiRole } from './mapAuthContextToProfile.js'
import { syncLegacyUserId } from './syncLegacyUserId.js'
import { isDev } from '../config/env.js'

const DEV_MOCK_PROFILES = {
  learner: {
    id: '50a630f4-826e-45aa-8f70-653e5e592fc3',
    name: 'Dev Learner'
  },
  trainer: {
    id: '20000000-0000-0000-0000-000000000001',
    name: 'Dev Trainer'
  }
}

const EMPTY_PROFILE = {
  id: null,
  directoryUserId: null,
  userId: null,
  name: null,
  primaryRole: '',
  isTrainer: false,
  isSystemAdmin: false,
  authenticated: false
}

/**
 * Loads trusted identity from GET /api/v1/auth/context when authenticated.
 */
export function AuthIdentityLoader({ children }) {
  const { isAuthenticated } = useAuth()
  const { userRole, setUserProfile, setUserRole, setIdentityReady, setIdentityLoading } = useApp()

  const loadIdentity = useCallback(async () => {
    if (!isAuthenticated) {
      if (isDev()) {
        const profile = DEV_MOCK_PROFILES[userRole] || DEV_MOCK_PROFILES.learner
        setUserProfile({
          ...EMPTY_PROFILE,
          ...profile,
          role: userRole
        })
      } else {
        setUserProfile(EMPTY_PROFILE)
      }
      setIdentityReady(true)
      setIdentityLoading(false)
      return
    }

    setIdentityLoading(true)
    setIdentityReady(false)

    try {
      const response = await fetchAuthContext()
      const data = response?.data || response
      const profile = mapAuthContextToProfile(data)
      const uiRole = mapAuthContextToUiRole(data)

      setUserProfile(profile)
      setUserRole(uiRole)
      syncLegacyUserId(profile.directoryUserId)
    } catch (error) {
      console.warn('[CourseBuilder Auth] Failed to load auth context:', error?.message || error)
      setUserProfile(EMPTY_PROFILE)
    } finally {
      setIdentityLoading(false)
      setIdentityReady(true)
    }
  }, [
    isAuthenticated,
    userRole,
    setUserProfile,
    setUserRole,
    setIdentityReady,
    setIdentityLoading
  ])

  useEffect(() => {
    loadIdentity()
  }, [loadIdentity])

  return children
}

export default AuthIdentityLoader
