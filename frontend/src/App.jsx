import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import Header from './components/Header.jsx'
import AccessibilityControls from './components/AccessibilityControls.jsx'
import ChatbotWidget from './components/ChatbotWidget.jsx'
import Toast from './components/Toast.jsx'
import CoursesPage from './pages/CoursesPage.jsx'
import CourseDetailsPage from './pages/CourseDetailsPage.jsx'
import LessonPage from './pages/LessonPage.jsx'
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

function AppShell() {
  const { userRole } = useRole()
  const isLearner = userRole === 'learner'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-700 dark:from-slate-900 dark:to-slate-950" data-testid="app-root">
      <a href="#main" className="skip-link">Skip to main content</a>
      <Header />
      <main id="main" className="pt-28 px-4 md:px-8 pb-20">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={isLearner ? '/learner/dashboard' : '/trainer/dashboard'} replace />}
          />

          {/* Shared */}
          <Route path="/courses/:id" element={<CourseDetailsPage />} />
          <Route path="/lessons/:id" element={<LessonPage />} />
          <Route path="/course/:id/assessment" element={<AssessmentPage />} />
          <Route path="/feedback/:courseId" element={<FeedbackPage />} />
          <Route path="/course/:id/feedback" element={<FeedbackPage />} />

          {/* Learner Routes */}
          {isLearner && (
            <>
              <Route path="/learner/dashboard" element={<LearnerDashboard />} />
              <Route path="/learner/marketplace" element={<LearnerMarketplace />} />
              <Route path="/learner/for-you" element={<LearnerForYou />} />
              <Route path="/learner/library" element={<LearnerLibrary />} />
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
      <ChatbotWidget />
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
