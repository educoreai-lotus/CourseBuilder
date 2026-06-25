import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import HomePage from '../../src/pages/HomePage.jsx'
import { AppProvider } from '../../src/context/AppContext.jsx'

jest.mock('../../src/services/apiService.js', () => ({
  fetchAuthContext: jest.fn(() =>
    Promise.resolve({
      success: true,
      data: { directoryUserId: 'dev-learner-id', role: 'learner', authenticated: true }
    })
  )
}))

test('renders hero title and CTAs', () => {
  render(
    <AppProvider>
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    </AppProvider>
  )
  expect(screen.getByText(/Build and Publish Intelligent Courses/i)).toBeInTheDocument()
  expect(screen.getByText(/Browse Courses/i)).toBeInTheDocument()
})


