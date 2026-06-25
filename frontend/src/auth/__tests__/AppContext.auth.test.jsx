import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

const DIRECTORY_USER_ID = 'dir-user-123'
const JASMINE_ID = '50a630f4-826e-45aa-8f70-653e5e592fc3'

jest.mock('../AuthContext.jsx', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ isAuthenticated: true, token: 'jwt-token' })
}))

jest.mock('../mapAuthContextToProfile.js', () => ({
  mapAuthContextToProfile: (data = {}) => ({
    id: data.directoryUserId || null,
    directoryUserId: data.directoryUserId || null,
    userId: data.userId || data.directoryUserId || null,
    role: data.role || 'learner',
    primaryRole: data.primaryRole || '',
    isTrainer: data.isTrainer === true,
    isSystemAdmin: data.isSystemAdmin === true,
    authenticated: data.authenticated === true,
    name: null
  }),
  mapAuthContextToUiRole: () => 'learner'
}))

jest.mock('../syncLegacyUserId.js', () => ({
  syncLegacyUserId: jest.fn()
}))

jest.mock('../../services/apiService.js', () => ({
  fetchAuthContext: jest.fn()
}))

jest.mock('../../config/env.js', () => ({
  isDev: jest.fn(() => false)
}))

import { fetchAuthContext } from '../../services/apiService.js'
import { syncLegacyUserId } from '../syncLegacyUserId.js'
import { AppProvider, useApp } from '../../context/AppContext.jsx'
import { AuthIdentityLoader } from '../AuthIdentityLoader.jsx'

function IdentityProbe() {
  const { userProfile, identityReady } = useApp()
  return (
    <div>
      <span data-testid="identity-ready">{String(identityReady)}</span>
      <span data-testid="profile-id">{userProfile?.id || ''}</span>
      <span data-testid="profile-name">{userProfile?.name || ''}</span>
    </div>
  )
}

describe('AuthIdentityLoader', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchAuthContext.mockReset()
  })

  test('loads userProfile.id from /auth/context when token exists', async () => {
    fetchAuthContext.mockResolvedValue({
      success: true,
      data: {
        directoryUserId: DIRECTORY_USER_ID,
        userId: DIRECTORY_USER_ID,
        id: DIRECTORY_USER_ID,
        role: 'learner',
        primaryRole: 'REGULAR_EMPLOYEE',
        isTrainer: false,
        isSystemAdmin: false,
        authenticated: true
      }
    })

    render(
      <AppProvider>
        <AuthIdentityLoader>
          <IdentityProbe />
        </AuthIdentityLoader>
      </AppProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('identity-ready')).toHaveTextContent('true')
    })

    expect(fetchAuthContext).toHaveBeenCalled()
    expect(screen.getByTestId('profile-id')).toHaveTextContent(DIRECTORY_USER_ID)
    expect(screen.getByTestId('profile-id')).not.toHaveTextContent(JASMINE_ID)
    expect(screen.getByTestId('profile-name')).toHaveTextContent('')
    expect(syncLegacyUserId).toHaveBeenCalledWith(DIRECTORY_USER_ID)
  })
})
