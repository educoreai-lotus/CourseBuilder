import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('../../services/apiService.js', () => ({
  getCourses: jest.fn().mockResolvedValue({ courses: [] }),
  getLearnerProgress: jest.fn().mockResolvedValue([])
}))

jest.mock('../../context/AppContext', () => ({
  useApp: jest.fn()
}))

import { useApp } from '../../context/AppContext'

function WelcomeBanner() {
  const { userProfile } = useApp()
  return (
    <h1>
      Welcome back{userProfile?.name ? `, ${userProfile.name}` : ''}!
    </h1>
  )
}

describe('Learner dashboard welcome', () => {
  test('does not show Jasmine when no trusted display name exists', () => {
    useApp.mockReturnValue({
      userProfile: { id: 'dir-user-123', name: null },
      identityReady: true
    })

    render(<WelcomeBanner />)

    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
    expect(screen.queryByText(/Jasmine/i)).not.toBeInTheDocument()
  })
})
