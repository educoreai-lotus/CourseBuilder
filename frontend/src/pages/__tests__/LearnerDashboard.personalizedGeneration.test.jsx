import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LearnerDashboard from '../LearnerDashboard.jsx'
import { getCourses, getLearnerProgress, getPersonalizedGenerationJobs } from '../../services/apiService.js'
import {
  FAILED_GENERATION_MESSAGE,
  GENERATING_MESSAGE
} from '../../utils/personalizedGenerationJobs.js'

jest.mock('../../services/apiService.js', () => ({
  getCourses: jest.fn(),
  getLearnerProgress: jest.fn(),
  getPersonalizedGenerationJobs: jest.fn()
}))

jest.mock('../../context/AppContext', () => ({
  useApp: jest.fn()
}))

import { useApp } from '../../context/AppContext'

const personalized = {
  id: 'p1',
  title: 'Personalized Ready',
  course_type: 'learner_specific',
  created_by_user_id: 'learner-1',
  description: 'Ready path'
}

const marketplace = {
  id: 'm1',
  title: 'Marketplace Course',
  course_type: 'trainer',
  rating: 4.8,
  description: 'Market path'
}

describe('LearnerDashboard personalized generation guard', () => {
  beforeEach(() => {
    useApp.mockReturnValue({
      showToast: jest.fn(),
      userProfile: { id: 'learner-1', name: 'Ada' },
      identityReady: true
    })
    getCourses.mockResolvedValue({ courses: [personalized, marketplace] })
    getLearnerProgress.mockResolvedValue([])
    getPersonalizedGenerationJobs.mockResolvedValue({ jobs: [] })
  })

  function renderDash() {
    return render(
      <MemoryRouter>
        <LearnerDashboard />
      </MemoryRouter>
    )
  }

  test('legacy personalized dashboard card unchanged', async () => {
    renderDash()
    expect(await screen.findByText('Personalized Ready')).toBeInTheDocument()
    expect(screen.getByText('Start learning')).toBeInTheDocument()
  })

  test('active job matching dashboard course → no Start learning', async () => {
    getPersonalizedGenerationJobs.mockResolvedValue({
      jobs: [
        {
          job_id: 'j1',
          status: 'processing',
          course_id: 'p1',
          competency_target_name: 'Building'
        }
      ]
    })
    renderDash()
    expect(await screen.findByText(GENERATING_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText('Start learning')).not.toBeInTheDocument()
  })

  test('completed / no-active job → current dashboard behavior', async () => {
    getPersonalizedGenerationJobs.mockResolvedValue({
      jobs: [{ job_id: 'j1', status: 'completed', course_id: 'p1' }]
    })
    renderDash()
    expect(await screen.findByText('Start learning')).toBeInTheDocument()
    expect(screen.queryByText(GENERATING_MESSAGE)).not.toBeInTheDocument()
  })

  test('failed matching job → not falsely ready', async () => {
    getPersonalizedGenerationJobs.mockResolvedValue({
      jobs: [
        {
          job_id: 'j1',
          status: 'failed',
          course_id: 'p1',
          competency_target_name: 'Broken',
          error_message: 'secret internal'
        }
      ]
    })
    renderDash()
    expect(await screen.findByText(FAILED_GENERATION_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText('Start learning')).not.toBeInTheDocument()
    expect(screen.queryByText(/secret internal/i)).not.toBeInTheDocument()
  })

  test('non-personalized dashboard course unaffected', async () => {
    getPersonalizedGenerationJobs.mockResolvedValue({
      jobs: [{ job_id: 'j1', status: 'processing', course_id: 'p1', competency_target_name: 'X' }]
    })
    renderDash()
    expect(await screen.findByText('Marketplace Course')).toBeInTheDocument()
    expect(screen.getByText('View details')).toBeInTheDocument()
  })

  test('does not render a foreign personalized course', async () => {
    getCourses.mockResolvedValue({
      courses: [
        personalized,
        {
          id: 'p-foreign',
          title: 'Foreign Personalized',
          course_type: 'learner_specific',
          created_by_user_id: 'other-learner',
          description: 'Not yours'
        },
        marketplace
      ]
    })
    renderDash()
    expect(await screen.findByText('Personalized Ready')).toBeInTheDocument()
    expect(screen.queryByText('Foreign Personalized')).not.toBeInTheDocument()
    expect(screen.getByText('Marketplace Course')).toBeInTheDocument()
  })
})
