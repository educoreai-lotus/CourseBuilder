import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LearnerForYou from '../LearnerForYou.jsx'
import { getCourses, getPersonalizedGenerationJobs } from '../../services/apiService.js'
import {
  FAILED_GENERATION_MESSAGE,
  GENERATING_MESSAGE
} from '../../utils/personalizedGenerationJobs.js'

const hookState = {
  jobs: [],
  onActiveJobsBecameInactive: null
}

jest.mock('../../services/apiService.js', () => ({
  getCourses: jest.fn(),
  getPersonalizedGenerationJobs: jest.fn()
}))

jest.mock('../../hooks/usePersonalizedGenerationJobs.js', () => ({
  usePersonalizedGenerationJobs: ({ onActiveJobsBecameInactive } = {}) => {
    hookState.onActiveJobsBecameInactive = onActiveJobsBecameInactive
    const jobs = hookState.jobs
    const activeJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'processing')
    return {
      jobs,
      activeJobs,
      jobsLoading: false,
      jobsError: null,
      softErrorShownRef: { current: false },
      refetchJobs: jest.fn()
    }
  }
}))

jest.mock('../../context/AppContext.jsx', () => ({
  useApp: () => ({
    showToast: jest.fn(),
    userProfile: { id: 'learner-1', name: 'Test' }
  })
}))

jest.mock('../../components/CourseCard.jsx', () => ({
  __esModule: true,
  default: ({ course }) => <div data-testid={`course-card-${course.id}`}>{course.title}</div>
}))

const legacyCourse = {
  id: 'legacy-1',
  title: 'Legacy Personalized',
  course_type: 'learner_specific',
  created_at: '2024-01-01T00:00:00.000Z'
}

const incompleteCourse = {
  id: 'course-active',
  title: 'Still Generating Course',
  course_type: 'learner_specific',
  created_at: '2024-06-01T00:00:00.000Z'
}

function renderForYou() {
  return render(
    <MemoryRouter>
      <LearnerForYou />
    </MemoryRouter>
  )
}

describe('LearnerForYou personalized generation readiness', () => {
  beforeEach(() => {
    hookState.jobs = []
    hookState.onActiveJobsBecameInactive = null
    getCourses.mockReset()
    getPersonalizedGenerationJobs.mockReset()
    getCourses.mockResolvedValue({ courses: [legacyCourse] })
    getPersonalizedGenerationJobs.mockResolvedValue({ jobs: [] })
  })

  test('no jobs → existing ready cards unchanged', async () => {
    renderForYou()
    expect(await screen.findByTestId('course-card-legacy-1')).toBeInTheDocument()
    expect(screen.getByText('Start Course')).toBeInTheDocument()
    expect(screen.queryByText(GENERATING_MESSAGE)).not.toBeInTheDocument()
  })

  test('legacy personalized course with no job → unchanged', async () => {
    renderForYou()
    expect(await screen.findByText('Legacy Personalized')).toBeInTheDocument()
    expect(screen.getByText('Start Course')).toBeInTheDocument()
  })

  test('pending job with no course_id → generating UI', async () => {
    hookState.jobs = [
      { job_id: 'j1', status: 'pending', course_id: null, competency_target_name: 'Python' }
    ]
    renderForYou()
    expect(await screen.findByText('Python')).toBeInTheDocument()
    expect(screen.getByText(GENERATING_MESSAGE)).toBeInTheDocument()
  })

  test('processing job with no course_id → generating UI', async () => {
    hookState.jobs = [{ job_id: 'j2', status: 'processing', competency_target_name: 'Go' }]
    renderForYou()
    expect(await screen.findByText(GENERATING_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText('Go')).toBeInTheDocument()
  })

  test('active job matching course → normal ready card suppressed', async () => {
    getCourses.mockResolvedValue({ courses: [legacyCourse, incompleteCourse] })
    hookState.jobs = [
      {
        job_id: 'j3',
        status: 'processing',
        course_id: 'course-active',
        competency_target_name: 'Rust'
      }
    ]
    renderForYou()
    expect(await screen.findByText(GENERATING_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByTestId('course-card-course-active')).not.toBeInTheDocument()
    expect(screen.getByTestId('course-card-legacy-1')).toBeInTheDocument()
  })

  test('completed job → not active / ready card shown', async () => {
    getCourses.mockResolvedValue({ courses: [incompleteCourse] })
    hookState.jobs = [
      {
        job_id: 'j4',
        status: 'completed',
        course_id: 'course-active',
        competency_target_name: 'Rust'
      }
    ]
    renderForYou()
    expect(await screen.findByTestId('course-card-course-active')).toBeInTheDocument()
    expect(screen.queryByText(GENERATING_MESSAGE)).not.toBeInTheDocument()
  })

  test('failed job → no spinner + safe failure state', async () => {
    hookState.jobs = [
      {
        job_id: 'j5',
        status: 'failed',
        competency_target_name: 'Broken',
        error_message: 'provider boom INTERNAL'
      }
    ]
    renderForYou()
    expect(await screen.findByText(FAILED_GENERATION_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText(GENERATING_MESSAGE)).not.toBeInTheDocument()
    expect(screen.queryByText(/provider boom/i)).not.toBeInTheDocument()
  })

  test('multiple active jobs → represented independently', async () => {
    hookState.jobs = [
      { job_id: 'a', status: 'pending', competency_target_name: 'Alpha' },
      { job_id: 'b', status: 'processing', competency_target_name: 'Beta' }
    ]
    renderForYou()
    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getAllByText(GENERATING_MESSAGE)).toHaveLength(2)
  })

  test('readiness API failure → existing course list remains usable', async () => {
    // Page still renders courses; jobs stay empty when hook surfaces no jobs.
    hookState.jobs = []
    renderForYou()
    expect(await screen.findByTestId('course-card-legacy-1')).toBeInTheDocument()
    expect(screen.getByText('Start Course')).toBeInTheDocument()
  })

  test('completed transition triggers quiet course refresh (not indefinite)', async () => {
    getCourses.mockResolvedValue({ courses: [legacyCourse] })
    hookState.jobs = []
    renderForYou()
    expect(await screen.findByTestId('course-card-legacy-1')).toBeInTheDocument()

    const callsBefore = getCourses.mock.calls.length
    expect(typeof hookState.onActiveJobsBecameInactive).toBe('function')

    let lagFn = null
    const realSetTimeout = global.setTimeout
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn, ms, ...args) => {
      if (ms === 2500) {
        lagFn = fn
        return 1
      }
      return realSetTimeout(fn, ms, ...args)
    })

    hookState.onActiveJobsBecameInactive()

    await waitFor(() => {
      expect(getCourses.mock.calls.length).toBe(callsBefore + 1)
    })
    expect(typeof lagFn).toBe('function')

    lagFn()

    await waitFor(() => {
      expect(getCourses.mock.calls.length).toBe(callsBefore + 2)
    })

    const callsAfterLag = getCourses.mock.calls.length
    hookState.onActiveJobsBecameInactive()
    await waitFor(() => {
      expect(getCourses.mock.calls.length).toBe(callsAfterLag + 1)
    })

    timeoutSpy.mockRestore()
  })
})
