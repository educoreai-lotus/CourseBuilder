import { useCallback, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { startAssessment } from '../services/apiService.js'
import { getAuthToken } from '../auth/tokenStorage.js'
import { getAssessmentFrontendUrl } from '../config/env.js'
import { buildAssessmentPostcourseRedirectUrl } from '../utils/assessmentRedirect.js'

const MISSING_TOKEN_MESSAGE = 'Session token is missing. Please sign in again.'

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
        const response = await startAssessment(courseId, {
          learner_id: userProfile?.id,
          learner_name: userProfile?.name
        })

        const token = getAuthToken()
        if (!token?.trim()) {
          showToast(MISSING_TOKEN_MESSAGE, 'error')
          setLaunching(false)
          return
        }

        let assessmentUrl
        try {
          assessmentUrl = buildAssessmentPostcourseRedirectUrl({
            redirectUrl: response?.redirect_url,
            envFrontendUrl: getAssessmentFrontendUrl(),
            courseId,
            token
          })
        } catch {
          showToast(MISSING_TOKEN_MESSAGE, 'error')
          setLaunching(false)
          return
        }

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
