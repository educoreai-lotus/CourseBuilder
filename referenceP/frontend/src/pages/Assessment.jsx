import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import useUserStore from '../store/useUserStore'
import api from '../services/api'
import { Clock, CheckCircle, XCircle, ArrowLeft, BookOpen, Award, MessageCircle } from 'lucide-react'

function Assessment() {
  const { id } = useParams()
  const { currentUser, getCourseProgress } = useUserStore()
  const [course, setCourse] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [score, setScore] = useState(null)
  const [timeLeft, setTimeLeft] = useState(60 * 60) // 60 minutes in seconds

  useEffect(() => {
    const loadAssessment = async () => {
      setIsLoading(true)
      try {
        // Load course data from backend API
        const courseResponse = await api.course.getCourse(id)
        if (!courseResponse.success) {
          throw new Error('Course not found')
        }

        setCourse(courseResponse.data)

        // Generate assessment questions based on course content
        const questions = generateAssessmentQuestions(courseResponse.data)
        setAssessment({
          id: `assessment_${id}_${Date.now()}`,
          courseId: id,
          questions,
          timeLimit: 60, // 60 minutes
          passingScore: 70
        })
      } catch (error) {
        console.error('Failed to load assessment:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAssessment()
  }, [id])

  // Timer effect
  useEffect(() => {
    if (assessment && !isCompleted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitAssessment()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [assessment, isCompleted, timeLeft])

  const generateAssessmentQuestions = (course) => {
    const skills = course.metadata?.skills || ['programming', 'development']
    return [
      {
        id: 1,
        question: `What is the main purpose of ${skills[0] || 'this technology'}?`,
        options: [
          'To create user interfaces',
          'To manage databases',
          'To handle server-side logic',
          'To optimize performance'
        ],
        correct: 0
      },
      {
        id: 2,
        question: `Which of the following is a key feature of ${skills[1] || 'this framework'}?`,
        options: [
          'Component-based architecture',
          'Static typing',
          'Server-side rendering',
          'All of the above'
        ],
        correct: 3
      },
      {
        id: 3,
        question: `What is the recommended approach for state management in ${skills[0] || 'modern applications'}?`,
        options: [
          'Global variables',
          'Local component state only',
          'Centralized state management',
          'No state management needed'
        ],
        correct: 2
      },
      {
        id: 4,
        question: `Which testing strategy is most effective for ${skills[0] || 'web applications'}?`,
        options: [
          'Unit testing only',
          'Integration testing only',
          'End-to-end testing only',
          'Combination of all testing types'
        ],
        correct: 3
      },
      {
        id: 5,
        question: `What is the primary benefit of using ${skills[1] || 'modern development tools'}?`,
        options: [
          'Faster development',
          'Better code quality',
          'Improved debugging',
          'All of the above'
        ],
        correct: 3
      }
    ]
  }

  const handleAnswerSelect = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }))
  }

  const handleNextQuestion = () => {
    if (currentQuestion < assessment.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleSubmitAssessment = async () => {
    setIsSubmitting(true)
    
    // Calculate score
    let correctAnswers = 0
    assessment.questions.forEach(question => {
      if (answers[question.id] === question.correct) {
        correctAnswers++
      }
    })
    
    const finalScore = Math.round((correctAnswers / assessment.questions.length) * 100)
    setScore(finalScore)
    setIsCompleted(true)
    setIsSubmitting(false)
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading assessment..." />
  }

  if (!course || !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
            <BookOpen size={32} />
          </div>
          <h1 className="hero-content h1 mb-4" style={{ color: 'var(--text-primary)' }}>Assessment Not Found</h1>
          <p className="hero-content p mb-6" style={{ color: 'var(--text-secondary)' }}>The assessment you're looking for doesn't exist.</p>
          <Link to="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  if (isCompleted) {
    const passed = score >= assessment.passingScore
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="microservice-card max-w-md w-full text-center">
          <div className={`service-icon mx-auto mb-4 ${passed ? 'bg-green-500' : 'bg-red-500'}`}>
            {passed ? <CheckCircle size={32} /> : <XCircle size={32} />}
          </div>
          
          <h1 className="hero-content h1 mb-4" style={{ color: 'var(--text-primary)' }}>
            {passed ? 'Congratulations!' : 'Assessment Complete'}
          </h1>
          
          <div className="text-4xl font-bold mb-4" style={{ color: passed ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
            {score}%
          </div>
          
          <p className="microservice-card p mb-6" style={{ color: 'var(--text-secondary)' }}>
            {passed 
              ? `You passed the assessment! You scored ${score}% and demonstrated mastery of the course material.`
              : `You scored ${score}%. The passing score is ${assessment.passingScore}%. Review the course material and try again.`
            }
          </p>
          
          <div className="space-y-3">
            <Link
              to={`/feedback/${id}`}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} />
              Give Course Feedback
            </Link>
            <Link
              to={`/study/${id}`}
              className="btn btn-secondary w-full"
            >
              Back to Course
            </Link>
            {!passed && (
              <button
                onClick={() => {
                  setCurrentQuestion(0)
                  setAnswers({})
                  setIsCompleted(false)
                  setScore(null)
                  setTimeLeft(60 * 60)
                }}
                className="btn btn-secondary w-full"
              >
                Retake Assessment
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const currentQ = assessment.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / assessment.questions.length) * 100

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            to={`/study/${id}`}
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} />
            Back to Course
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <Clock size={16} />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Question {currentQuestion + 1} of {assessment.questions.length}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${progress}%`,
                background: 'var(--gradient-primary)'
              }}
            ></div>
          </div>
        </div>

        {/* Assessment Content */}
        <div className="max-w-3xl mx-auto">
          <div className="microservice-card">
            <div className="mb-8">
              <h1 className="hero-content h1 mb-4" style={{ color: 'var(--text-primary)' }}>
                <Award className="inline mr-3" size={32} />
                {course.title} - Final Exam
              </h1>
              <p className="hero-content p mb-4" style={{ color: 'var(--text-secondary)' }}>
                Complete this final exam to test your knowledge and earn your certificate
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6" style={{ 
                background: 'var(--bg-secondary)', 
                borderColor: 'var(--accent-gold)',
                borderWidth: '1px'
              }}>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  <strong>Note:</strong> This is the final exam. Make sure you have completed all lessons and exercises before taking this assessment.
                </p>
              </div>
            </div>

            {/* Question */}
            <div className="mb-8">
              <h2 className="microservice-card h3 mb-6" style={{ color: 'var(--text-primary)' }}>
                {currentQ.question}
              </h2>
              
              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(currentQ.id, index)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      answers[currentQ.id] === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      background: answers[currentQ.id] === index ? 'var(--bg-secondary)' : 'var(--bg-card)',
                      borderColor: answers[currentQ.id] === index ? 'var(--primary-cyan)' : 'var(--bg-tertiary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        answers[currentQ.id] === index ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {answers[currentQ.id] === index && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestion === 0}
                className="btn btn-secondary"
                style={{ opacity: currentQuestion === 0 ? 0.5 : 1 }}
              >
                Previous
              </button>
              
              <div className="flex gap-3">
                {currentQuestion === assessment.questions.length - 1 ? (
                  <button
                    onClick={handleSubmitAssessment}
                    disabled={isSubmitting}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Award size={16} />
                        Submit Assessment
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="btn btn-primary"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Assessment