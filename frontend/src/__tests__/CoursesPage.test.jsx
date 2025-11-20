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
          course_id: '1',
          title: 'AI Fundamentals',
          description: 'Introduction to AI fundamentals',
          level: 'beginner',
          rating: 4.5,
          course_type: 'trainer', // Required for marketplace course filter
          created_by_user_id: '20000000-0000-0000-0000-000000000001'
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


