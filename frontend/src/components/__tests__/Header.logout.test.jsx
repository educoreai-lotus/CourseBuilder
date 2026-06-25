jest.mock('../../auth/tokenStorage.js', () => ({
  getAuthToken: jest.fn(() => 'mock-token'),
  applyRotatedTokenFromHeaders: jest.fn(),
  clearAuthToken: jest.fn()
}))

jest.mock('../../auth/logout.js', () => ({
  logout: jest.fn(() => Promise.resolve())
}))

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from '../../context/AppContext.jsx'
import { AuthProvider } from '../../auth/AuthContext.jsx'
import Header from '../Header.jsx'
import { logout } from '../../auth/logout.js'

test('Logout button calls logout utility', async () => {
  const user = userEvent.setup()

  render(
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )

  await user.click(screen.getByRole('button', { name: 'Logout' }))

  expect(logout).toHaveBeenCalledTimes(1)
})
