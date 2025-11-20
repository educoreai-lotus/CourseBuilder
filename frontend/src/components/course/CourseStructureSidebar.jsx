import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Folder,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Lock
} from 'lucide-react'
import { isPersonalized } from '../../utils/courseTypeUtils.js'
import { useApp } from '../../context/AppContext.jsx'

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

const getLessonState = (lessonId, completedLessonIds, unlocked, status) => {
  const completed = completedLessonIds.includes(String(lessonId))
  const accessible = unlocked || status === 'unlocked' || completed
  return { completed, accessible }
}

export default function CourseStructureSidebar({
  course,
  learnerProgress = null,
  currentLessonId = null,
  userRole = 'learner',
  onSelectLesson
}) {
  const { showToast } = useApp()

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
  const [expandedTopics, setExpandedTopics] = useState(() =>
    new Set(hierarchy.map((topic) => topic.id))
  )
  const [expandedModules, setExpandedModules] = useState(() => new Set())

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
      <div className="rounded-xl border p-4 text-center" style={{ 
        borderColor: 'var(--border-color, rgba(148,163,184,0.18))',
        backgroundColor: 'var(--bg-card, var(--bg-primary))'
      }}>
        <BookOpen className="mx-auto mb-3 h-6 w-6" style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Modules will appear here once the course publisher adds structured content.
        </p>
      </div>
    )
  }

  const normalizedCurrentLessonId = currentLessonId ? String(currentLessonId) : null

  return (
    <div className="h-full">
      <div className="rounded-xl border p-4 shadow-sm transition-colors sticky top-4" style={{
        borderColor: 'var(--border-color, rgba(148,163,184,0.18))',
        backgroundColor: 'var(--bg-card, var(--bg-primary))'
      }}>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Course Structure
        </h3>
        <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
          {hierarchy.map((topic) => {
            const topicExpanded = expandedTopics.has(topic.id)
            return (
              <div
                key={topic.id}
                className="rounded-lg border transition-colors"
                style={{
                  borderColor: 'var(--border-color, rgba(148,163,184,0.12))',
                  backgroundColor: 'var(--bg-secondary)'
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleTopic(topic.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                  style={{
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary, rgba(148,163,184,0.1))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-[var(--primary-cyan)]" />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {topic.title}
                    </span>
                  </div>
                  {topicExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {topicExpanded && (
                  <div className="space-y-2 px-3 pb-3">
                    {(topic.modules || []).map((module) => {
                      const moduleExpanded = expandedModules.has(module.id)
                      return (
                        <div
                          key={module.id}
                          className="rounded-lg border transition-colors"
                          style={{
                            borderColor: 'var(--border-color, rgba(148,163,184,0.08))',
                            backgroundColor: 'var(--bg-card)'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleModule(module.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                            style={{
                              color: 'var(--text-primary)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--bg-secondary, rgba(148,163,184,0.1))'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Folder size={12} className="text-[var(--primary-cyan)]" />
                              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {module.title}
                              </span>
                            </div>
                            {moduleExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>

                          {moduleExpanded && (
                            <ul className="space-y-1 px-3 pb-2">
                              {(module.lessons || []).map((lesson) => {
                                const lessonId = String(lesson.id)
                                const { completed, accessible } = getLessonState(
                                  lessonId,
                                  completedLessons,
                                  canAccessLessons,
                                  lesson.status
                                )
                                const disabled = !accessible && userRole === 'learner'
                                const isActive = normalizedCurrentLessonId === lessonId

                                return (
                                  <li key={lessonId}>
                                    <button
                                      type="button"
                                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all ${
                                        disabled ? 'cursor-not-allowed opacity-60' : ''
                                      }`}
                                      style={{
                                        background: isActive
                                          ? 'rgba(14,165,233,0.15)'
                                          : completed
                                            ? 'rgba(16,185,129,0.1)'
                                            : 'transparent',
                                        border: isActive ? '1px solid var(--primary-cyan, #0ea5e9)' : '1px solid transparent',
                                        color: 'var(--text-primary)'
                                      }}
                                      onClick={() => handleLessonClick(lessonId)}
                                      disabled={disabled}
                                      onMouseEnter={(e) => {
                                        if (!disabled && !isActive) {
                                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary, rgba(148,163,184,0.1))'
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isActive) {
                                          e.currentTarget.style.backgroundColor = completed
                                            ? 'rgba(16,185,129,0.1)'
                                            : 'transparent'
                                        }
                                      }}
                                    >
                                      <span className="flex-shrink-0">
                                        {completed ? (
                                          <CheckCircle2 size={14} className="text-[#10b981]" />
                                        ) : accessible ? (
                                          <PlayCircle size={14} className="text-[var(--primary-cyan)]" />
                                        ) : (
                                          <Lock size={14} className="text-[var(--text-muted)]" />
                                        )}
                                      </span>
                                      <span className="flex-1 text-xs font-medium leading-tight">{lesson.title}</span>
                                      {completed && (
                                        <CheckCircle2 size={12} className="flex-shrink-0 text-[#10b981]" />
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

