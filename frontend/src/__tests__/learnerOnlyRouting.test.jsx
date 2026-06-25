import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppProvider } from '../context/AppContext.jsx'
import { AuthProvider } from '../auth/AuthContext.jsx'

jest.mock('../auth/tokenStorage.js', () => ({
  getAuthToken: jest.fn(() => 'mock-token'),
  applyRotatedTokenFromHeaders: jest.fn(),
  clearAuthToken: jest.fn()
}))

jest.mock('../services/apiService.js', () => ({
  fetchAuthContext: jest.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        directoryUserId: 'trainer-dir-id',
        role: 'trainer',
        isTrainer: true,
        isSystemAdmin: false,
        primaryRole: 'SENIOR_TRAINER',
        authenticated: true
      }
    })
  ),
  getCourses: jest.fn(() => Promise.resolve({ courses: [] })),
  getLearnerProgress: jest.fn(() => Promise.resolve([]))
}))

jest.mock('../auth/logout.js', () => ({ logout: jest.fn() }))
jest.mock('../auth/initializeEducoreBotIfAuthenticated.js', () => ({
  initializeEducoreBotIfAuthenticated: jest.fn()
}))
jest.mock('../auth/AuthIdentityLoader.jsx', () => ({
  AuthIdentityLoader: ({ children }) => children
}))
jest.mock('../components/Header.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="header-mock">Header</div>
}))
jest.mock('../components/AccessibilityControls.jsx', () => ({
  __esModule: true,
  default: () => null
}))
jest.mock('../components/Toast.jsx', () => ({
  __esModule: true,
  default: () => null
}))
jest.mock('../components/ErrorBoundary.jsx', () => ({
  __esModule: true,
  default: ({ children }) => children
}))
jest.mock('../pages/LearnerDashboard.jsx', () => ({
  __esModule: true,
  default: () => <div>Welcome back!</div>
}))
jest.mock('../pages/LearnerMarketplace.jsx', () => ({ __esModule: true, default: () => null }))
jest.mock('../pages/LearnerForYou.jsx', () => ({ __esModule: true, default: () => null }))
jest.mock('../pages/LearnerLibrary.jsx', () => ({ __esModule: true, default: () => null }))
jest.mock('../pages/CoursesPage.jsx', () => ({ __esModule: true, default: () => null }))
jest.mock('../pages/CourseDetailsPage.jsx', () => ({ __esModule: true, default: () => null }))
jest.mock('../pages/LessonPage.jsx', () => ({ __esModule: true, default: () => null }))
jest.mock('../pages/LessonExercisesPage.jsx', () => ({ __esModule: true, default: () => null }))
jest.mock('../pages/FeedbackPage.jsx', () => ({ __esModule: true, default: () => null }))
jest.mock('../pages/AssessmentPage.jsx', () => ({ __esModule: true, default: () => null }))
jest.mock('../pages/SignInRequired.jsx', () => ({ __esModule: true, default: () => null }))
jest.mock('../pages/TrainerDashboard.jsx', () => ({
  __esModule: true,
  default: () => <div>Trainer workspace</div>
}))

import App from '../App.jsx'

function renderApp(initialPath) {
  return render(
    <AuthProvider>
      <AppProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </AppProvider>
    </AuthProvider>
  )
}

describe('learner-only App routing', () => {
  test('trainer auth context lands on learner dashboard at /', async () => {
    renderApp('/')

    await waitFor(() => {
      expect(screen.getByText(/Welcome back!/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/Trainer workspace/i)).not.toBeInTheDocument()
  })

  test('/trainer/dashboard redirects to learner dashboard', async () => {
    renderApp('/trainer/dashboard')

    await waitFor(() => {
      expect(screen.getByText(/Welcome back!/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/Trainer workspace/i)).not.toBeInTheDocument()
  })

  test('/trainer/courses redirects to learner dashboard', async () => {
    renderApp('/trainer/courses')

    await waitFor(() => {
      expect(screen.getByText(/Welcome back!/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/Trainer workspace/i)).not.toBeInTheDocument()
  })
})
