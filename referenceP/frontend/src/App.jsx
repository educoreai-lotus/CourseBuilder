import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { User } from 'lucide-react'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './contexts/ToastContext'
import Container from './components/Container'
import Header from './components/Header'
import useUserStore from './store/useUserStore'

// Lazy load learner-focused pages
const Home = lazy(() => import('./pages/Home'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const Personalized = lazy(() => import('./pages/Personalized'))
const CourseDetails = lazy(() => import('./pages/CourseDetails'))
const StudyCourse = lazy(() => import('./pages/StudyCourse'))
const LessonPage = lazy(() => import('./pages/LessonPage'))
const Assessment = lazy(() => import('./pages/Assessment'))
const Feedback = lazy(() => import('./pages/Feedback'))
const MyLibrary = lazy(() => import('./pages/MyLibrary'))

function App() {
  const { currentUser, loginAsLearner } = useUserStore()

  // Auto-login as learner for demo (in production, user would come from auth microservice)
  useEffect(() => {
    if (!currentUser) {
      loginAsLearner() // Default to learner for demo
    }
  }, [currentUser, loginAsLearner])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <div className="min-h-screen">
            {/* Header Component */}
            <Header />

            {/* Main Content */}
            <main className="pt-24">
              <Suspense fallback={
                <div className="loading">
                  <div className="loading-spinner"></div>
                </div>
              }>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/personalized" element={<Personalized />} />
                  <Route path="/course/:courseId/lesson/:lessonId" element={<LessonPage />} />
                  <Route path="/course/:id" element={<CourseDetails />} />
                  <Route path="/study/:id" element={<StudyCourse />} />
                  <Route path="/assessment/:id" element={<Assessment />} />
                  <Route path="/feedback/:id" element={<Feedback />} />
                  <Route path="/library" element={<MyLibrary />} />
                </Routes>
              </Suspense>
            </main>

            {/* Contextual Chatbot */}
            <div className="chatbot-widget visible">
              <button className="chatbot-toggle" aria-label="Open chatbot">
                <div className="chatbot-avatar">
                  <User size={24} />
                </div>
              </button>
            </div>

            {/* Accessibility Controls */}
            <button className="accessibility-toggle" aria-label="Accessibility controls">
              <User size={20} />
            </button>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App