import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react'
import { getAuthToken } from './tokenStorage.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken())

  const syncToken = useCallback(() => {
    setToken(getAuthToken())
  }, [])

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'auth_token' || event.key === null) {
        syncToken()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [syncToken])

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      refreshAuth: syncToken
    }),
    [token, syncToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
