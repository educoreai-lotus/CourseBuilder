import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import useUserStore from '../store/useUserStore'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Download, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageCircle,
  Bookmark,
  Share2,
  ArrowLeft,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Circle,
  CheckCircle2
} from 'lucide-react'

function LessonPage() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useUserStore()
  
  // Course and lesson data
  const [course, setCourse] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [topics, setTopics] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Lesson state
  const [isCompleted, setIsCompleted] = useState(false)
  const [exerciseCompleted, setExerciseCompleted] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [bookmarked, setBookmarked] = useState(false)
  const [rating, setRating] = useState(0)
  
  // Progress tracking
  const [lessonProgress, setLessonProgress] = useState(0)
  const [currentTopic, setCurrentTopic] = useState(null)
  const [currentModule, setCurrentModule] = useState(null)
  const [showExerciseModal, setShowExerciseModal] = useState(false)

  useEffect(() => {
    console.log('LessonPage mounted with courseId:', courseId, 'lessonId:', lessonId)
    // Reset lesson state when navigating to a new lesson
    setIsCompleted(false)
    setExerciseCompleted(false)
    setRating(0)
    setNotes('')
    setBookmarked(false)
    setLessonProgress(0)
    loadCourseData()
  }, [courseId, lessonId])

  const loadCourseData = async () => {
    try {
      setLoading(true)
      
      // Load course data
      const courseResponse = await api.course.getCourse(courseId)
      if (courseResponse.success) {
        setCourse(courseResponse.data)
      }
      
      // Load topics
      const topicsResponse = await api.course.getCourseTopics(courseId)
      if (topicsResponse.success) {
        setTopics(topicsResponse.data)
      }
      
      // Load lessons
      const lessonsResponse = await api.course.getCourseLessons(courseId)
      if (lessonsResponse.success) {
        setLessons(lessonsResponse.data)
        
        // Find current lesson
        const currentLesson = lessonsResponse.data.find(l => l.id === lessonId)
        if (currentLesson) {
          console.log('Current lesson:', currentLesson)
          console.log('Lesson exercise:', currentLesson.exercise)
          setLesson(currentLesson)
          
          // Find current topic and module
          const topic = topicsResponse.data.find(t => 
            t.modules.some(m => m.lessons.some(l => l.id === lessonId))
          )
          if (topic) {
            setCurrentTopic(topic)
            const module = topic.modules.find(m => 
              m.lessons.some(l => l.id === lessonId)
            )
            if (module) {
              setCurrentModule(module)
            }
          }
        } else {
          setError('Lesson not found')
        }
      }
    } catch (error) {
      console.error('Error loading course data:', error)
      setError('Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false)
      setVolume(1)
    } else {
      setIsMuted(true)
      setVolume(0)
    }
  }

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handlePreviousLesson = () => {
    const currentIndex = lessons.findIndex(l => l.id === lessonId)
    if (currentIndex > 0) {
      const prevLesson = lessons[currentIndex - 1]
      navigate(`/course/${courseId}/lesson/${prevLesson.id}`)
    }
  }

  const handleNextLesson = () => {
    const currentIndex = lessons.findIndex(l => l.id === lessonId)
    if (currentIndex < lessons.length - 1) {
      const nextLesson = lessons[currentIndex + 1]
      navigate(`/course/${courseId}/lesson/${nextLesson.id}`)
    }
  }

  const handleExerciseSubmit = () => {
    setExerciseCompleted(true)
    console.log('Exercise submitted and marked as completed')
  }

  const handleMarkComplete = () => {
    setIsCompleted(!isCompleted)
    // Update lesson progress
    setLessonProgress(isCompleted ? 0 : 100)
  }

  const handleLessonClick = (topicId, moduleId, lessonId) => {
    navigate(`/course/${courseId}/lesson/${lessonId}`)
  }

  // Check if all lessons are completed (for exam access)
  const completedLessons = lessons.filter(lesson => lesson.completed).length
  const allLessonsCompleted = completedLessons === lessons.length
  const currentIndex = lessons.findIndex(l => l.id === lessonId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="service-icon mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
            <BookOpen size={32} />
          </div>
          <h1 className="hero-content h1 mb-4" style={{ color: 'var(--text-primary)' }}>Lesson Not Found</h1>
          <p className="hero-content p mb-6" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="btn btn-primary"
          >
            Back to Course
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar - Course Structure */}
      <div className="w-80 flex-shrink-0" style={{ 
        background: 'var(--bg-card)', 
        borderRight: '1px solid var(--bg-tertiary)',
        height: '100vh',
        overflowY: 'auto',
        position: 'sticky',
        top: 0
      }}>
        <div className="p-6">
          {/* Course Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              className="flex items-center gap-2 text-sm mb-4" 
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft size={16} />
              Back to Course
            </button>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {course?.title}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {completedLessons} of {lessons.length} lessons completed
            </p>
          </div>

          {/* Course Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Course Progress
              </span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {Math.round((completedLessons / lessons.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2" style={{ background: 'var(--bg-tertiary)' }}>
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(completedLessons / lessons.length) * 100}%`,
                  background: allLessonsCompleted ? 'var(--accent-green)' : 'var(--gradient-primary)'
                }}
              ></div>
            </div>
          </div>

          {/* Topics Structure */}
          <div className="space-y-4">
            {topics.map((topic, topicIndex) => (
              <div key={topic.id} className="border rounded-lg" style={{ borderColor: 'var(--bg-tertiary)' }}>
                {/* Topic Header */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {topic.title}
                    </h3>
                    <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {topic.modules.length} modules
                  </p>
                </div>

                {/* Modules */}
                <div className="p-2">
                  {topic.modules.map((module, moduleIndex) => (
                    <div key={module.id} className="mb-3">
                      {/* Module Header */}
                      <div className="flex items-center justify-between p-3 rounded-lg mb-2" 
                           style={{ background: 'var(--bg-secondary)' }}>
                        <div className="flex items-center gap-2">
                          <ChevronRightIcon size={14} style={{ color: 'var(--text-secondary)' }} />
                          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                            {module.title}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {module.lessons.length} lessons
                        </span>
                      </div>

                      {/* Lessons */}
                      <div className="ml-4 space-y-1">
                        {module.lessons.map((lessonItem, lessonIndex) => {
                          const isCurrentLesson = lessonItem.id === lessonId
                          const isCompleted = lessonItem.completed
                          const isCurrentTopic = topic.id === currentTopic?.id
                          const isCurrentModule = module.id === currentModule?.id
                          
                          return (
                            <button
                              key={lessonItem.id}
                              onClick={() => handleLessonClick(topic.id, module.id, lessonItem.id)}
                              className={`w-full text-left p-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                                isCurrentLesson 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'hover:bg-gray-100'
                              }`}
                              style={{
                                background: isCurrentLesson ? 'var(--primary-cyan)' : 'transparent',
                                color: isCurrentLesson ? 'white' : 'var(--text-primary)',
                                ':hover': { background: isCurrentLesson ? 'var(--primary-cyan)' : 'var(--bg-secondary)' }
                              }}
                            >
                              <div className="flex-shrink-0">
                                {isCompleted ? (
                                  <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} />
                                ) : (
                                  <Circle size={16} style={{ color: 'var(--text-muted)' }} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-medium">
                                  {lessonItem.title}
                                </div>
                                <div className="text-xs opacity-75">
                                  {lessonItem.duration}
                                </div>
                              </div>
                              {isCurrentLesson && (
                                <div className="flex-shrink-0">
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Lesson Content */}
        <div className="flex-1 p-8" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <div className="max-w-4xl mx-auto">
            {/* Lesson Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    {lesson.title}
                  </h1>
                  <div className="flex items-center gap-6 text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>{lesson.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} />
                      <span>{lesson.type === 'video' ? 'Video Lesson' : 'Interactive Lesson'}</span>
                    </div>
                  </div>
                  
                  {/* Lesson Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Lesson Progress
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {lessonProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2" style={{ background: 'var(--bg-tertiary)' }}>
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${lessonProgress}%`,
                          background: 'var(--gradient-primary)'
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Lesson Navigation */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={handlePreviousLesson}
                      disabled={currentIndex === 0}
                      className="btn btn-secondary flex items-center gap-2"
                      style={{ opacity: currentIndex === 0 ? 0.5 : 1 }}
                    >
                      <ChevronLeft size={16} />
                      <span>Previous</span>
                    </button>

                    <button
                      onClick={handleMarkComplete}
                      className={`btn flex items-center gap-2 ${
                        isCompleted ? 'btn-success' : 'btn-primary'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle size={16} />
                          <span>Completed</span>
                        </>
                      ) : (
                        <>
                          <Circle size={16} />
                          <span>Mark as Complete</span>
                        </>
                      )}
                    </button>

                    {currentIndex === lessons.length - 1 ? (
                      <button
                        onClick={() => navigate(`/assessment/${courseId}`)}
                        className="btn btn-primary flex items-center gap-2"
                        style={{ background: 'var(--accent-gold)', border: 'none' }}
                      >
                        <BookOpen size={16} />
                        <span>Take Final Exam</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleNextLesson}
                        className="btn btn-primary flex items-center gap-2"
                      >
                        <span>Next</span>
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setBookmarked(!bookmarked)}
                    className={`p-2 rounded-lg transition-colors ${
                      bookmarked ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-gray-100'
                    }`}
                    style={{ color: bookmarked ? 'var(--accent-gold)' : 'var(--text-secondary)' }}
                  >
                    <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Video Player */}
            <div className="microservice-card mb-8">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <Play size={32} style={{ color: 'white' }} />
                    </div>
                    <p style={{ color: 'white' }}>Video Player Placeholder</p>
                    <p className="text-sm opacity-75" style={{ color: 'white' }}>
                      {lesson.duration} • Click to play
                    </p>
                  </div>
                </div>
                
                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePlayPause}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-white text-sm">{formatTime(currentTime)}</span>
                      <div className="flex-1 bg-white bg-opacity-30 rounded-full h-1">
                        <div 
                          className="bg-white h-1 rounded-full transition-all duration-300"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-sm">{formatTime(duration)}</span>
                    </div>
                    
                    <button
                      onClick={handleMuteToggle}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    
                    <button
                      onClick={handleFullscreen}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      <Maximize size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lesson Content */}
            <div className="microservice-card mb-8">
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Lesson Content
              </h3>
              <div className="prose max-w-none text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {lesson.content || 'Lesson content will be displayed here. This could include text, images, code examples, and interactive elements.'}
              </div>
            </div>

            {/* Exercise Button */}
            {lesson && (
              <div className="microservice-card mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                      <BookOpen className="inline mr-2" size={20} />
                      Exercise Available
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Complete this exercise to reinforce your learning
                    </p>
                  </div>
                  <button
                    onClick={() => setShowExerciseModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <BookOpen size={16} />
                    <span>Start Exercise</span>
                  </button>
                </div>
              </div>
            )}

            {/* Resources */}
            {lesson.resources && lesson.resources.length > 0 && (
              <div className="microservice-card mb-8">
                <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lesson.resources.map((resource, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 border rounded-lg" style={{ 
                      borderColor: 'var(--bg-tertiary)',
                      background: 'var(--bg-secondary)'
                    }}>
                      <div className="flex-shrink-0">
                        {resource.type === 'pdf' ? (
                          <Download size={20} style={{ color: 'var(--accent-red)' }} />
                        ) : (
                          <ExternalLink size={20} style={{ color: 'var(--primary-cyan)' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {resource.title}
                        </h4>
                        <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                          {resource.type.toUpperCase()} • {resource.size}
                        </p>
                      </div>
                      <button className="btn btn-secondary text-sm px-3 py-1">
                        {resource.type === 'pdf' ? 'Download' : 'Open'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="microservice-card mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Notes</h3>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="btn btn-secondary text-sm"
                >
                  {showNotes ? 'Hide Notes' : 'Show Notes'}
                </button>
              </div>
              {showNotes && (
                <div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Take notes about this lesson..."
                    className="w-full p-4 border rounded-lg resize-none" 
                    style={{ 
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      minHeight: '120px'
                    }}
                  />
                  <div className="flex justify-end mt-3">
                    <button className="btn btn-primary text-sm">
                      Save Notes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Exercise Modal */}
      {showExerciseModal && lesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)' }}>
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  <BookOpen className="inline mr-2" size={24} />
                  {lesson.exercise?.title || 'Practice Exercise'}
                </h2>
                <button
                  onClick={() => setShowExerciseModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ×
                </button>
              </div>

              {/* Exercise Description */}
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                {lesson.exercise?.description || 'Complete this exercise to reinforce your learning.'}
              </p>

              {/* Exercise Questions */}
              <div className="space-y-4 mb-6">
                {(lesson.exercise?.questions || [
                  {
                    question: "What is the main topic covered in this lesson?",
                    options: ["Option A", "Option B", "Option C", "Option D"]
                  },
                  {
                    question: "Which concept is most important to remember?",
                    options: ["Concept 1", "Concept 2", "Concept 3", "Concept 4"]
                  }
                ]).map((question, index) => (
                  <div key={index} className="border rounded-lg p-4" style={{ 
                    borderColor: 'var(--bg-tertiary)',
                    background: 'var(--bg-secondary)'
                  }}>
                    <p className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                      {index + 1}. {question.question}
                    </p>
                    <div className="space-y-2">
                      {question.options?.map((option, optIndex) => (
                        <label key={optIndex} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-100" style={{ ':hover': { background: 'var(--bg-tertiary)' } }}>
                          <input 
                            type="radio" 
                            name={`question-${index}`}
                            className="text-blue-600"
                          />
                          <span style={{ color: 'var(--text-secondary)' }}>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowExerciseModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                {exerciseCompleted ? (
                  <div className="flex items-center gap-2 text-green-600" style={{ color: 'var(--accent-green)' }}>
                    <CheckCircle size={20} />
                    <span className="font-medium">Exercise Completed!</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      handleExerciseSubmit()
                      setShowExerciseModal(false)
                    }}
                    className="btn btn-primary"
                  >
                    Submit Exercise
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LessonPage