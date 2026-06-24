import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute.jsx'
import { AuthProvider } from '../AuthContext.jsx'
import { AUTH_TOKEN_STORAGE_KEY } from '../tokenStorage.js'

function ProtectedPage() {
  return <div>Protected content</div>
}

function renderProtected(initialPath = '/protected') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/sign-in-required" element={<div>Sign in required page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<ProtectedPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('redirects to sign-in-required when no token', () => {
    renderProtected()
    expect(screen.getByText('Sign in required page')).toBeInTheDocument()
  })

  test('allows access when token exists', () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'valid-token')
    renderProtected()
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  test('redirects when only legacy mock token key exists', () => {
    localStorage.setItem('token', '50a630f4-826e-45aa-8f70-653e5e592fc3')
    localStorage.setItem('user_id', '50a630f4-826e-45aa-8f70-653e5e592fc3')
    renderProtected()
    expect(screen.getByText('Sign in required page')).toBeInTheDocument()
  })
})
