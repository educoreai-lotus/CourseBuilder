import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import CoursesPage from '../../src/pages/CoursesPage.jsx'
import { AppProvider } from '../../src/context/AppContext.jsx'

// Mock API layer to avoid network in unit test
jest.mock('../../src/services/apiService.js', () => ({
  getCourses: jest.fn(() =>
    Promise.resolve({
      page: 1,
      total: 1,
      courses: [
        {
          id: '1',
          title: 'AI Fundamentals',
          description: 'Intro',
          level: 'beginner',
          rating: 4.5
        }
      ]
    })
  )
}))

test('renders courses list item', async () => {
  render(
    <AppProvider>
      <BrowserRouter>
        <CoursesPage />
      </BrowserRouter>
    </AppProvider>
  )
  expect(await screen.findByText(/AI Fundamentals/)).toBeInTheDocument()
})


