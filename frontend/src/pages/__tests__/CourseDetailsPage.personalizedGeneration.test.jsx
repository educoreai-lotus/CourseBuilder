import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CourseDetailsPage from '../CourseDetailsPage.jsx'
import {
  getCourseById,
  fetchEnrollmentStatus,
  getPersonalizedGenerationJobs,
  getMyFeedback,
  registerLearner
} from '../../services/apiService.js'
import {
  FAILED_GENERATION_MESSAGE,
  GENERATING_MESSAGE
} from '../../utils/personalizedGenerationJobs.js'

jest.mock('../../services/apiService.js', () => ({
  getCourseById: jest.fn(),
  fetchEnrollmentStatus: jest.fn(),
  getPersonalizedGenerationJobs: jest.fn(),
  getMyFeedback: jest.fn(),
  registerLearner: jest.fn(),
  cancelEnrollment: jest.fn()
}))

jest.mock('../../context/AppContext', () => ({
  useApp: () => ({
    showToast: jest.fn(),
    userRole: 'learner',
    userProfile: { id: 'learner-1', name: 'Ada' }
  })
}))

const personalizedCourse = {
  id: 'course-1',
  title: 'Overview Personalized',
  course_type: 'learner_specific',
  created_by_user_id: 'learner-1',
  description: 'Desc',
  topics: [
    {
      id: 't1',
      modules: [{ id: 'm1', lessons: [{ id: 'lesson-1', title: 'L1' }] }]
    }
  ]
}

function renderDetails(path = '/courses/course-1?personalized=true') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/courses/:id" element={<CourseDetailsPage />} />
        <Route path="/course/:id/overview" element={<CourseDetailsPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CourseDetailsPage overview generation guard', () => {
  beforeEach(() => {
    getCourseById.mockResolvedValue(personalizedCourse)
    fetchEnrollmentStatus.mockResolvedValue({ enrolled: true, progress: 0, completedLessons: 0 })
    getMyFeedback.mockResolvedValue(null)
    getPersonalizedGenerationJobs.mockResolvedValue({ jobs: [] })
    registerLearner.mockReset()
    registerLearner.mockResolvedValue({ status: 'registered' })
  })

  test('active matching job → generating state without Start Course', async () => {
    getPersonalizedGenerationJobs.mockResolvedValue({
      jobs: [
        {
          job_id: 'j1',
          status: 'processing',
          course_id: 'course-1',
          competency_target_name: 'Pending Path'
        }
      ]
    })

    renderDetails()
    expect(await screen.findByText(GENERATING_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start course/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/personalized learning path is ready/i)).not.toBeInTheDocument()
  })

  test('legacy / no-job personalized course → existing overview', async () => {
    renderDetails()
    expect(await screen.findByRole('button', { name: /start course/i })).toBeInTheDocument()
    expect(screen.getByText(/personalized learning path is ready/i)).toBeInTheDocument()
  })

  test('failed matching job → safe failure UI', async () => {
    getPersonalizedGenerationJobs.mockResolvedValue({
      jobs: [
        {
          job_id: 'j1',
          status: 'failed',
          course_id: 'course-1',
          competency_target_name: 'Fail Path',
          error_message: 'raw provider'
        }
      ]
    })
    renderDetails()
    expect(await screen.findByText(FAILED_GENERATION_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText(/raw provider/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start course/i })).not.toBeInTheDocument()
  })

  test('jobs endpoint failure → no page crash / graceful degradation', async () => {
    getPersonalizedGenerationJobs.mockRejectedValue(new Error('jobs down'))
    renderDetails()
    expect(await screen.findByRole('button', { name: /start course/i })).toBeInTheDocument()
  })

  test('non-personalized course unaffected by generation jobs', async () => {
    getCourseById.mockResolvedValue({
      id: 'market-1',
      title: 'Market Overview',
      course_type: 'trainer',
      description: 'x',
      topics: []
    })
    getPersonalizedGenerationJobs.mockResolvedValue({
      jobs: [{ job_id: 'j1', status: 'processing', course_id: 'market-1' }]
    })

    renderDetails('/courses/market-1')
    expect(await screen.findByRole('button', { name: /enroll/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText(GENERATING_MESSAGE)).not.toBeInTheDocument()
    })
    expect(registerLearner).not.toHaveBeenCalled()
  })

  test('does not auto-enroll a foreign personalized course', async () => {
    fetchEnrollmentStatus.mockResolvedValue({ enrolled: false, progress: 0, completedLessons: 0 })
    getCourseById.mockResolvedValue({
      ...personalizedCourse,
      created_by_user_id: 'other-learner'
    })
    renderDetails()
    await waitFor(() => {
      expect(getCourseById).toHaveBeenCalled()
    })
    expect(registerLearner).not.toHaveBeenCalled()
  })

  test('auto-enrolls owned personalized course when not enrolled', async () => {
    fetchEnrollmentStatus.mockResolvedValue({ enrolled: false, progress: 0, completedLessons: 0 })
    renderDetails()
    await waitFor(() => {
      expect(registerLearner).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ learner_id: 'learner-1' })
      )
    })
  })
})
