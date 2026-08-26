import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CourseOverview from '../../components/course/CourseOverview.jsx'
import {
  FAILED_GENERATION_MESSAGE,
  GENERATING_MESSAGE
} from '../../utils/personalizedGenerationJobs.js'

const personalizedCourse = {
  id: 'c1',
  title: 'My Personalized Course',
  course_type: 'learner_specific',
  description: 'A path',
  topics: []
}

const marketplaceCourse = {
  id: 'm1',
  title: 'Market Course',
  course_type: 'trainer',
  description: 'Market',
  topics: []
}

function renderOverview(props = {}) {
  return render(
    <MemoryRouter>
      <CourseOverview
        course={personalizedCourse}
        isEnrolled
        progress={0}
        showStructureCta
        onContinue={jest.fn()}
        onEnrollClick={jest.fn()}
        {...props}
      />
    </MemoryRouter>
  )
}

describe('CourseOverview personalized generation readiness', () => {
  test('active matching job → generating state and no ready copy / Start Course', () => {
    renderOverview({
      generationReadiness: 'generating',
      generationCompetencyName: 'Java Basics'
    })

    expect(screen.getByText(GENERATING_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText(/personalized learning path is ready/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start course/i })).not.toBeInTheDocument()
  })

  test('legacy / no-job personalized course → existing overview unchanged', () => {
    renderOverview()
    expect(screen.getByText(/personalized learning path is ready/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start course/i })).toBeInTheDocument()
    expect(screen.queryByText(GENERATING_MESSAGE)).not.toBeInTheDocument()
  })

  test('failed matching job → safe failure UI', () => {
    renderOverview({
      generationReadiness: 'failed',
      generationCompetencyName: 'Broken Path'
    })
    expect(screen.getByText(FAILED_GENERATION_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start course/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/personalized learning path is ready/i)).not.toBeInTheDocument()
  })

  test('normal non-personalized course → unaffected', () => {
    renderOverview({
      course: marketplaceCourse,
      isEnrolled: false,
      generationReadiness: 'generating'
    })
    expect(screen.getByRole('button', { name: /enroll/i })).toBeInTheDocument()
    expect(screen.queryByText(GENERATING_MESSAGE)).not.toBeInTheDocument()
  })
})
