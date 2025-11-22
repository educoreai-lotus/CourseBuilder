import { useMemo, useState, useEffect } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Folder,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Lock,
  Sparkles
} from 'lucide-react'
import { isPersonalized, isMarketplace } from '../../utils/courseTypeUtils.js'
import { useApp } from '../../context/AppContext.jsx'
import EnrichmentButton from '../../features/enrichment/components/EnrichmentButton.jsx'

const normalizeHierarchy = (course) => {
  if (!course) return []

  const topics = Array.isArray(course.topics) ? course.topics : []

  if (topics.length > 0) {
    return topics.map((topic, index) => ({
      id: String(topic.id || topic.topic_id || `topic-${index}`),
      title: topic.title || topic.topic_title || `Topic ${index + 1}`,
      summary: topic.summary || topic.topic_description,
      modules: (topic.modules || []).map((module, moduleIndex) => ({
        id: String(module.id || module.module_id || `module-${moduleIndex}`),
        title: module.title || module.module_name || module.name || `Module ${moduleIndex + 1}`,
        description: module.summary || module.description,
        lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
          id: String(lesson.id || lesson.lesson_id || `lesson-${lessonIndex}`),
          title: lesson.title || lesson.lesson_name || `Lesson ${lessonIndex + 1}`,
          duration: lesson.duration || lesson.estimated_duration || 12,
          status: lesson.status || 'locked'
        }))
      }))
    }))
  }

  const modules = Array.isArray(course.modules) ? course.modules : []
  return [
    {
      id: 'default-topic',
      title: 'Course modules',
      summary: course.description,
      modules: modules.map((module, moduleIndex) => ({
        id: String(module.id || module.module_id || `module-${moduleIndex}`),
        title: module.title || module.module_name || module.name || `Module ${moduleIndex + 1}`,
        description: module.summary || module.description,
        lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
          id: String(lesson.id || lesson.lesson_id || `lesson-${lessonIndex}`),
          title: lesson.title || lesson.lesson_name || `Lesson ${lessonIndex + 1}`,
          duration: lesson.duration || lesson.estimated_duration || 12,
          status: lesson.status || 'locked'
        }))
      }))
    }
  ]
}

const formatDuration = (duration) => {
  if (!duration) return 'Approx. 12 mins'
  if (typeof duration === 'string') return duration
  return `${duration} mins`
}

// Check if a lesson is accessible based on previous lesson completion
const getLessonState = (lessonId, completedLessonIds, unlocked, status, allLessons, currentIndex) => {
  const completed = completedLessonIds.includes(String(lessonId))
  
  // For learners: Check if previous lesson is completed before unlocking next lesson
  // First lesson is always accessible if enrolled
  if (unlocked && allLessons && currentIndex !== undefined) {
    if (currentIndex === 0) {
      // First lesson is always accessible if enrolled
      return { completed, accessible: true }
    } else {
      // Check if previous lesson is completed
      const previousLesson = allLessons[currentIndex - 1]
      if (previousLesson) {
        const previousLessonId = String(previousLesson.id)
        const previousCompleted = completedLessonIds.includes(previousLessonId)
        return { completed, accessible: previousCompleted || status === 'unlocked' || completed }
      }
    }
  }
  
  // Default: accessible if unlocked or already completed
  const accessible = unlocked || status === 'unlocked' || completed
  return { completed, accessible }
}

export default function CourseStructureSidebar({
  course,
  learnerProgress = null,
  currentLessonId = null,
  userRole = 'learner',
  onSelectLesson,
  enrichmentAsset = null,
  onEnrichmentResults = null,
  onEnrichmentLoading = null,
  onEnrichmentError = null,
  enrichmentAssets = null
}) {
  const { showToast } = useApp()
  
  // Check if course is personalized for enrichment button placement
  const courseIsPersonalized = course ? isPersonalized(course) : false
  const isLearner = userRole === 'learner'

  // Determine if course is personalized
  const isPersonalizedCourse = isPersonalized(course)

  // Determine if learner can access lessons
  const isEnrolled = Boolean(learnerProgress?.is_enrolled)
  const canAccessLessons =
    userRole !== 'learner' ? true : isPersonalizedCourse || isEnrolled

  // Get completed lessons
  const completedLessons = useMemo(() => {
    if (!learnerProgress?.completed_lessons) return []
    return learnerProgress.completed_lessons.map(String)
  }, [learnerProgress])

  const hierarchy = useMemo(() => normalizeHierarchy(course), [course])
  
  // Flatten all lessons in order for progression check
  const allLessonsFlat = useMemo(() => {
    const lessons = []
    hierarchy.forEach((topic) => {
      topic.modules?.forEach((module) => {
        module.lessons?.forEach((lesson) => {
          lessons.push({ ...lesson, moduleId: module.id, topicId: topic.id })
        })
      })
    })
    return lessons
  }, [hierarchy])
  
  // Auto-expand topics and modules containing the current lesson
  const getInitialExpanded = useMemo(() => {
    if (!currentLessonId || hierarchy.length === 0) {
      return { topics: new Set(hierarchy.map((topic) => topic.id)), modules: new Set() }
    }
    
    const topicsSet = new Set()
    const modulesSet = new Set()
    
    // Find the current lesson's topic and module
    hierarchy.forEach((topic) => {
      topic.modules?.forEach((module) => {
        const hasCurrentLesson = module.lessons?.some(
          (lesson) => String(lesson.id) === String(currentLessonId)
        )
        if (hasCurrentLesson) {
          topicsSet.add(topic.id)
          modulesSet.add(module.id)
        }
      })
    })
    
    // If no match found, expand all topics
    if (topicsSet.size === 0) {
      hierarchy.forEach((topic) => topicsSet.add(topic.id))
    }
    
    return { topics: topicsSet, modules: modulesSet }
  }, [hierarchy, currentLessonId])
  
  const [expandedTopics, setExpandedTopics] = useState(() => getInitialExpanded.topics)
  const [expandedModules, setExpandedModules] = useState(() => getInitialExpanded.modules)
  
  // Update expanded state when currentLessonId changes
  useEffect(() => {
    setExpandedTopics(getInitialExpanded.topics)
    setExpandedModules(getInitialExpanded.modules)
  }, [currentLessonId, getInitialExpanded])

  const toggleTopic = (topicId) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(topicId)) {
        next.delete(topicId)
      } else {
        next.add(topicId)
      }
      return next
    })
  }

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const handleLessonClick = (lessonId) => {
    if (!canAccessLessons && userRole === 'learner') {
      showToast('Enroll to access lessons', 'info')
      return
    }
    if (onSelectLesson) {
      onSelectLesson(lessonId)
    }
  }

  if (hierarchy.length === 0) {
    return (
      <div className="rounded-2xl border p-6 text-center shadow-lg backdrop-blur-sm" style={{ 
        borderColor: 'var(--border-subtle, var(--border-color))',
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--shadow-card, 0 10px 40px rgba(0, 0, 0, 0.1))'
      }}>
        <div className="rounded-lg p-3 inline-block mb-3" style={{ backgroundColor: 'var(--chip-surface, rgba(56, 189, 248, 0.16))' }}>
          <BookOpen className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          No modules yet
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Modules will appear here once content is added.
        </p>
      </div>
    )
  }

  const normalizedCurrentLessonId = currentLessonId ? String(currentLessonId) : null

  return (
    <div 
      className="rounded-2xl border transition-all sticky top-6 overflow-hidden shadow-xl backdrop-blur-sm"
      style={{
        borderColor: 'var(--border-subtle, var(--border-color))',
        backgroundColor: 'var(--bg-card)',
        maxHeight: 'calc(100vh - 120px)',
        boxShadow: 'var(--shadow-card, 0 20px 60px rgba(0, 0, 0, 0.08))'
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-subtle, var(--border-color))' }}>
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 shadow-sm" style={{ 
            backgroundColor: 'var(--chip-surface, rgba(56, 189, 248, 0.16))',
            border: '1px solid var(--border-subtle)'
          }}>
            <Layers size={20} style={{ color: 'var(--primary-cyan)' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Course Structure
            </h3>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
              {hierarchy.reduce((total, topic) => total + (topic.modules?.length || 0), 0)} modules • {hierarchy.reduce((total, topic) => 
                total + (topic.modules || []).reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0), 0
              )} lessons
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <div className="space-y-2.5">
          {hierarchy.map((topic) => {
            const topicExpanded = expandedTopics.has(topic.id)
            const moduleCount = topic.modules?.length || 0
            return (
              <div
                key={topic.id}
                className="rounded-xl border transition-all hover:shadow-md"
                style={{
                  borderColor: 'var(--border-subtle, var(--border-color))',
                  backgroundColor: 'var(--bg-secondary)'
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleTopic(topic.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.01]"
                  style={{
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.parentElement.style.backgroundColor = 'var(--bg-primary)'
                    e.currentTarget.parentElement.style.borderColor = 'var(--primary-cyan)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.parentElement.style.backgroundColor = 'var(--bg-secondary)'
                    e.currentTarget.parentElement.style.borderColor = 'var(--border-subtle, var(--border-color))'
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="rounded-lg p-2 shadow-sm" style={{ 
                      backgroundColor: 'var(--chip-surface, rgba(56, 189, 248, 0.16))',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <Layers size={16} style={{ color: 'var(--primary-cyan)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold leading-tight block" style={{ color: 'var(--text-primary)' }}>
                        {topic.title}
                      </span>
                      <span className="text-xs mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                        {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {topicExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </button>

                {topicExpanded && (
                  <div className="space-y-2 px-4 pb-4 pt-2">
                    {(topic.modules || []).map((module) => {
                      const moduleExpanded = expandedModules.has(module.id)
                      const lessonCount = module.lessons?.length || 0
                      return (
                        <div
                          key={module.id}
                          className="rounded-lg border transition-all hover:shadow-sm"
                          style={{
                            borderColor: 'var(--border-subtle, var(--border-color))',
                            backgroundColor: 'var(--bg-card)'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleModule(module.id)}
                            className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3.5 py-3 text-left transition-all duration-200"
                            style={{
                              color: 'var(--text-primary)',
                              backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.parentElement.style.backgroundColor = 'var(--bg-primary)'
                              e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.parentElement.style.backgroundColor = 'var(--bg-card)'
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Folder size={15} style={{ color: 'var(--primary-cyan)' }} className="flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold leading-tight block" style={{ color: 'var(--text-primary)' }}>
                                  {module.title}
                                </span>
                                <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                                  {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                              {moduleExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                          </button>

                          {moduleExpanded && (
                            <ul className="space-y-1 px-4 pb-3 pt-1">
                              {(module.lessons || []).map((lesson) => {
                                const lessonId = String(lesson.id)
                                // Find index in flattened lessons array
                                const lessonIndex = allLessonsFlat.findIndex((l) => String(l.id) === lessonId)
                                const { completed, accessible } = getLessonState(
                                  lessonId,
                                  completedLessons,
                                  canAccessLessons,
                                  lesson.status,
                                  allLessonsFlat,
                                  lessonIndex
                                )
                                const disabled = !accessible && userRole === 'learner'
                                const isActive = normalizedCurrentLessonId === lessonId
                                
                                // Add tooltip for locked lessons
                                const lockTooltip = disabled && userRole === 'learner' && !completed
                                  ? 'Complete previous lesson to continue'
                                  : ''

                                return (
                                  <li key={lessonId}>
                                    <button
                                      type="button"
                                      title={lockTooltip}
                                      className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left transition-all duration-200 ${
                                        disabled ? 'cursor-not-allowed opacity-60' : ''
                                      } ${isActive ? 'shadow-md scale-[1.02]' : 'hover:scale-[1.01]'}`}
                                      style={{
                                        background: isActive
                                          ? 'var(--chip-surface, rgba(56, 189, 248, 0.16))'
                                          : completed
                                            ? 'var(--bg-tertiary)'
                                            : 'transparent',
                                        border: isActive ? '2px solid var(--primary-cyan)' : '1px solid transparent',
                                        color: 'var(--text-primary)'
                                      }}
                                      onClick={() => {
                                        if (disabled && userRole === 'learner') {
                                          showToast('Complete previous lesson to continue.', 'info')
                                          return
                                        }
                                        handleLessonClick(lessonId)
                                      }}
                                      disabled={disabled}
                                      onMouseEnter={(e) => {
                                        if (!disabled && !isActive) {
                                          e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                                          e.currentTarget.style.borderColor = 'var(--border-subtle)'
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isActive) {
                                          e.currentTarget.style.backgroundColor = completed
                                            ? 'var(--bg-tertiary)'
                                            : 'transparent'
                                          e.currentTarget.style.borderColor = 'transparent'
                                        }
                                      }}
                                    >
                                      <span className="flex-shrink-0">
                                        {completed ? (
                                          <CheckCircle2 size={16} style={{ color: 'var(--badge-color, var(--accent-green))' }} />
                                        ) : accessible ? (
                                          <PlayCircle size={16} style={{ color: 'var(--primary-cyan)' }} />
                                        ) : (
                                          <Lock size={16} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
                                        )}
                                      </span>
                                      <span className="flex-1 text-xs font-medium leading-tight truncate">{lesson.title}</span>
                                      {completed && (
                                        <CheckCircle2 size={12} className="flex-shrink-0" style={{ color: 'var(--badge-color, var(--accent-green))' }} />
                                      )}
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

