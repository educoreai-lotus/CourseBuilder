import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from '../../src/context/AppContext.jsx'
import { AuthProvider } from '../../src/auth/AuthContext.jsx'
import Header from '../../src/components/Header.jsx'

jest.mock('../../src/auth/logout.js', () => ({
  logout: jest.fn()
}))

test('renders header and navigation', () => {
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
})


