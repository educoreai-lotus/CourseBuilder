import { useCallback, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { startAssessment } from '../services/apiService.js'

/**
 * Shared hook to launch Assessment from anywhere in the app.
 * Reuses the exact logic previously implemented in AssessmentPage.
 */
export function useAssessmentLauncher() {
  const { showToast, userProfile } = useApp()
  const [launching, setLaunching] = useState(false)

  const launchAssessment = useCallback(
    async (courseId) => {
      if (!courseId || launching) return

      setLaunching(true)
      showToast('Starting assessment...', 'info')

      try {
        // Call backend API to start assessment via Coordinator
        const response = await startAssessment(courseId, {
          learner_id: userProfile?.id,
          learner_name: userProfile?.name
        })

        // Always redirect to Assessment intro page for postcourse exam
        // URL must stay in sync with backend assessment.controller.js
        const assessmentUrl =
          'https://assessment-seven-liard.vercel.app/exam-intro?examType=postcourse'

        showToast('Redirecting to assessment...', 'success')
        window.location.href = assessmentUrl
      } catch (error) {
        console.error('Error starting assessment:', error)
        showToast(
          error?.response?.data?.message || 'Failed to start assessment. Please try again.',
          'error'
        )
        setLaunching(false)
      }
    },
    [launching, showToast, userProfile?.id, userProfile?.name]
  )

  return {
    launchAssessment,
    launching
  }
}

export default useAssessmentLauncher


