import { useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { fetchAuthContext } from '../services/apiService.js'
import { mapAuthContextToProfile } from './mapAuthContextToProfile.js'
import { syncLegacyUserId } from './syncLegacyUserId.js'
import { isDev } from '../config/env.js'

const DEV_MOCK_PROFILE = {
  id: '50a630f4-826e-45aa-8f70-653e5e592fc3',
  name: 'Dev Learner'
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
  const { setUserProfile, setUserRole, setIdentityReady, setIdentityLoading } = useApp()

  const loadIdentity = useCallback(async () => {
    if (!isAuthenticated) {
      if (isDev()) {
        setUserProfile({
          ...EMPTY_PROFILE,
          ...DEV_MOCK_PROFILE,
          role: 'learner'
        })
        setUserRole('learner')
      } else {
        setUserProfile(EMPTY_PROFILE)
        setUserRole('learner')
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

      setUserProfile(profile)
      setUserRole('learner')
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
