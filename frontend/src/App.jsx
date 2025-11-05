import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import Header from './components/Header.jsx'
import AccessibilityControls from './components/AccessibilityControls.jsx'
import ChatbotWidget from './components/ChatbotWidget.jsx'
import Toast from './components/Toast.jsx'
import HomePage from './pages/HomePage.jsx'
import CoursesPage from './pages/CoursesPage.jsx'
import CourseDetailsPage from './pages/CourseDetailsPage.jsx'
import LessonPage from './pages/LessonPage.jsx'
import TrainerDashboard from './pages/TrainerDashboard.jsx'
import FeedbackPage from './pages/FeedbackPage.jsx'
import LearnerDashboard from './pages/LearnerDashboard.jsx'
import LearnerPersonalized from './pages/LearnerPersonalized.jsx'
import LearnerEnrolled from './pages/LearnerEnrolled.jsx'
import AssessmentPage from './pages/AssessmentPage.jsx'
import TrainerCourseValidation from './pages/TrainerCourseValidation.jsx'
import TrainerPublish from './pages/TrainerPublish.jsx'
import TrainerFeedbackAnalytics from './pages/TrainerFeedbackAnalytics.jsx'

export default function App() {
  return (
    <AppProvider>
      <div className={`min-h-screen ${document.documentElement.className}`} data-testid="app-root">
        <a href="#main" className="skip-link">Skip to main content</a>
        <Header />
        <main id="main" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetailsPage />} />
            <Route path="/lessons/:id" element={<LessonPage />} />
            
            {/* Learner Routes */}
            <Route path="/learner/dashboard" element={<LearnerDashboard />} />
            <Route path="/learner/personalized" element={<LearnerPersonalized />} />
            <Route path="/learner/enrolled" element={<LearnerEnrolled />} />
            <Route path="/course/:id/assessment" element={<AssessmentPage />} />
            
            {/* Trainer Routes */}
            <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
            <Route path="/trainer/course/:id" element={<TrainerCourseValidation />} />
            <Route path="/trainer/publish/:id" element={<TrainerPublish />} />
            <Route path="/trainer/feedback/:id" element={<TrainerFeedbackAnalytics />} />
            
            {/* Feedback Route */}
            <Route path="/feedback/:courseId" element={<FeedbackPage />} />
            <Route path="/course/:id/feedback" element={<FeedbackPage />} />
            
            {/* 404 */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <AccessibilityControls />
        <ChatbotWidget />
        <Toast />
      </div>
    </AppProvider>
  )
}
