import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider, useApp } from '../context/AppContext.jsx'
import { AuthProvider } from '../auth/AuthContext.jsx'
import Header from '../components/Header.jsx'

jest.mock('../auth/tokenStorage.js', () => ({
  getAuthToken: jest.fn(() => null),
  applyRotatedTokenFromHeaders: jest.fn(),
  clearAuthToken: jest.fn()
}))

jest.mock('../auth/logout.js', () => ({
  logout: jest.fn()
}))

function RoleProbe() {
  const { userRole, setUserRole } = useApp()
  return (
    <div>
      <span data-testid="user-role">{userRole}</span>
      <button type="button" onClick={() => setUserRole('trainer')}>
        try-trainer
      </button>
    </div>
  )
}

test('renders header and learner navigation', () => {
  render(
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
  expect(screen.getByText(/Course Builder/i)).toBeInTheDocument()
  expect(screen.getByText(/Marketplace/i)).toBeInTheDocument()
  expect(screen.queryByLabelText(/Switch workspace role/i)).not.toBeInTheDocument()
})

test('stale trainer localStorage normalizes to learner and setUserRole cannot persist trainer', () => {
  window.localStorage.setItem('coursebuilder:userRole', 'trainer')

  render(
    <AuthProvider>
      <AppProvider>
        <RoleProbe />
      </AppProvider>
    </AuthProvider>
  )

  expect(screen.getByTestId('user-role')).toHaveTextContent('learner')
  expect(window.localStorage.getItem('coursebuilder:userRole')).toBe('learner')

  screen.getByText('try-trainer').click()
  expect(screen.getByTestId('user-role')).toHaveTextContent('learner')
  expect(window.localStorage.getItem('coursebuilder:userRole')).toBe('learner')
})
