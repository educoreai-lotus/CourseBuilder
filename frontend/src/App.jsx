import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import Header from './components/Header.jsx'
import AccessibilityControls from './components/AccessibilityControls.jsx'
import Toast from './components/Toast.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import CoursesPage from './pages/CoursesPage.jsx'
import CourseDetailsPage from './pages/CourseDetailsPage.jsx'
import LessonPage from './pages/LessonPage.jsx'
import LessonExercisesPage from './pages/LessonExercisesPage.jsx'
import TrainerDashboard from './pages/TrainerDashboard.jsx'
import FeedbackPage from './pages/FeedbackPage.jsx'
import LearnerDashboard from './pages/LearnerDashboard.jsx'
import LearnerForYou from './pages/LearnerForYou.jsx'
import LearnerLibrary from './pages/LearnerLibrary.jsx'
import LearnerMarketplace from './pages/LearnerMarketplace.jsx'
import AssessmentPage from './pages/AssessmentPage.jsx'
import TrainerCourseValidation from './pages/TrainerCourseValidation.jsx'
import TrainerPublish from './pages/TrainerPublish.jsx'
import TrainerFeedbackAnalytics from './pages/TrainerFeedbackAnalytics.jsx'
import TrainerCourses from './pages/TrainerCourses.jsx'
import { useRole } from './hooks/useRole.js'

function LegacyCourseRedirect() {
  const { id } = useParams()
  return <Navigate to={`/course/${id}/overview`} replace />
}

function LegacyLessonRedirect() {
  return <Navigate to="/courses" replace />
}

function AppShell() {
  const { userRole } = useRole()
  const { userProfile } = useApp()
  const isLearner = userRole === 'learner'

  // Initialize Educore Bot when user profile is available
  useEffect(() => {
    if (!userProfile || !userProfile.id) return

    // Wait for bot script to load
    const initializeBot = () => {
      if (window.initializeEducoreBot) {
        window.initializeEducoreBot({
          microservice: 'COURSE_BUILDER',
          userId: userProfile.id,
          token: userProfile.id, // Using user ID as token since we don't have JWT tokens
          tenantId: 'default'
        })
      }
    }

    // Check if script is already loaded
    if (window.initializeEducoreBot) {
      initializeBot()
    } else {
      // Wait for script to load
      window.addEventListener('load', initializeBot)
      // Also try after a short delay in case load event already fired
      const timeoutId = setTimeout(initializeBot, 1000)
      return () => {
        window.removeEventListener('load', initializeBot)
        clearTimeout(timeoutId)
      }
    }
  }, [userProfile])

  return (
    <div className="min-h-screen" data-testid="app-root">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <Header />

      <main id="main">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={isLearner ? '/learner/dashboard' : '/trainer/dashboard'} replace />}
          />

          {/* Shared */}
          <Route path="/course/:id/overview" element={<CourseDetailsPage />} />
          <Route path="/course/:id/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/course/:id/lesson/:lessonId/exercises" element={<LessonExercisesPage />} />
          <Route path="/courses/:id" element={<LegacyCourseRedirect />} />
          <Route path="/lessons/:id" element={<LegacyLessonRedirect />} />
          <Route path="/course/:id/assessment" element={<AssessmentPage />} />
          <Route path="/feedback/:courseId" element={<FeedbackPage />} />
          <Route path="/course/:id/feedback" element={<FeedbackPage />} />

          {/* Learner Routes */}
          {isLearner && (
            <>
              <Route path="/learner/dashboard" element={<LearnerDashboard />} />
              <Route path="/learner/marketplace" element={<LearnerMarketplace />} />
              <Route path="/learner/personalized" element={<LearnerForYou />} />
              <Route path="/learner/enrolled" element={<LearnerLibrary />} />
              <Route path="/learner/for-you" element={<Navigate to="/learner/personalized" replace />} />
              <Route path="/learner/library" element={<Navigate to="/learner/enrolled" replace />} />
              <Route path="/courses" element={<CoursesPage />} />
            </>
          )}

          {/* Trainer Routes */}
          {!isLearner && (
            <>
              <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
              <Route path="/trainer/courses" element={<TrainerCourses />} />
              <Route path="/trainer/course/:id" element={<TrainerCourseValidation />} />
              <Route path="/trainer/publish/:id" element={<TrainerPublish />} />
              <Route path="/trainer/feedback/:id" element={<TrainerFeedbackAnalytics />} />
            </>
          )}

          <Route
            path="*"
            element={<Navigate to={isLearner ? '/learner/dashboard' : '/trainer/dashboard'} replace />}
          />
        </Routes>
      </main>

      <AccessibilityControls />
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  )
}
