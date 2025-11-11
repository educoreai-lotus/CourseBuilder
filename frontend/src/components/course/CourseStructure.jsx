import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Folder,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Lock,
  Circle,
  Clock
} from 'lucide-react'

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
  const completed = completedLessonIds.includes(lessonId)
  const accessible = unlocked || status === 'unlocked' || completed
  return { completed, accessible }
}

export default function CourseStructure({
  course,
  onSelectLesson,
  completedLessonIds = [],
  unlocked = false
}) {
  const hierarchy = useMemo(() => normalizeHierarchy(course), [course])
  const [expandedTopics, setExpandedTopics] = useState(() => new Set(hierarchy.map((topic) => topic.id)))
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

  if (hierarchy.length === 0) {
    return (
      <div className="rounded-2xl border border-[rgba(148,163,184,0.18)] bg-white/90 p-10 text-center shadow-sm backdrop-blur">
        <BookOpen className="mx-auto mb-4 h-8 w-8 text-[var(--text-muted)]" />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Modules will appear here once the course publisher adds structured content.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {hierarchy.map((topic) => {
        const topicExpanded = expandedTopics.has(topic.id)
        return (
          <div
            key={topic.id}
            className="rounded-3xl border border-[rgba(148,163,184,0.16)] bg-white/90 shadow-sm backdrop-blur transition-shadow hover:shadow-lg"
          >
            <button
              type="button"
              onClick={() => toggleTopic(topic.id)}
              className="flex w-full items-start justify-between gap-4 rounded-3xl px-6 py-5 text-left transition-colors hover:bg-[var(--bg-secondary)]/40"
            >
              <div className="flex items-start gap-4">
                <span className="mt-1 rounded-xl bg-[rgba(14,165,233,0.12)] p-3 text-[var(--primary-cyan)]">
                  <Layers size={18} />
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {topic.title}
                    </h3>
                    <span className="rounded-full bg-[rgba(15,118,110,0.12)] px-3 py-1 text-xs font-semibold text-[#047857]">
                      {(topic.modules?.length || 0)} module{topic.modules?.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {topic.summary && (
                    <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                      {topic.summary}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-1 text-[var(--text-muted)]">
                {topicExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            </button>

            {topicExpanded && (
              <div className="space-y-4 px-6 pb-6">
                {(topic.modules || []).map((module) => {
                  const moduleExpanded = expandedModules.has(module.id)
                  return (
                    <div
                      key={module.id}
                      className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-secondary)]/40"
                    >
                      <button
                        type="button"
                        onClick={() => toggleModule(module.id)}
                        className="flex w-full items-start justify-between gap-4 rounded-2xl px-5 py-4 text-left transition-colors hover:bg-[var(--bg-secondary)]/60"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-1 rounded-xl bg-white/70 p-2 text-[var(--primary-cyan)] shadow-sm">
                            <Folder size={16} />
                          </span>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {module.title}
                              </h4>
                              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
                                {(module.lessons?.length || 0)} lesson{module.lessons?.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            {module.description && (
                              <p className="text-xs leading-6" style={{ color: 'var(--text-secondary)' }}>
                                {module.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 text-[var(--text-muted)]">
                          {moduleExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                      </button>

                      {moduleExpanded && (
                        <ul className="space-y-2 px-5 pb-4">
                          {(module.lessons || []).map((lesson) => {
                            const lessonId = lesson.id
                            const { completed, accessible } = getLessonState(
                              lessonId,
                              completedLessonIds,
                              unlocked,
                              lesson.status
                            )
                            const disabled = !accessible

                            return (
                              <li key={lessonId}>
                                <button
                                  type="button"
                                  className={`flex w-full items-center justify-between gap-4 rounded-2xl border border-transparent px-4 py-3 text-left transition-all ${
                                    disabled
                                      ? 'cursor-not-allowed opacity-60'
                                      : 'hover:border-[var(--primary-cyan)] hover:bg-white'
                                  }`}
                                  style={{
                                    background: completed ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.9)',
                                    color: 'var(--text-primary)',
                                    boxShadow: completed ? '0 8px 20px rgba(16,185,129,0.12)' : 'none'
                                  }}
                                  onClick={() => {
                                    if (!disabled) {
                                      onSelectLesson?.(lessonId)
                                    }
                                  }}
                                  disabled={disabled}
                                >
                                  <div className="flex items-center gap-4">
                                    <span className="rounded-full bg-[rgba(14,165,233,0.12)] p-2 text-[var(--primary-cyan)]">
                                      {completed ? (
                                        <CheckCircle2 size={18} />
                                      ) : accessible ? (
                                        <PlayCircle size={18} />
                                      ) : (
                                        <Lock size={18} />
                                      )}
                                    </span>
                                    <div className="space-y-1">
                                      <div className="font-semibold">{lesson.title}</div>
                                      <div className="flex items-center gap-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                        <span className="flex items-center gap-1">
                                          <Clock size={12} />
                                          {formatDuration(lesson.duration)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          {completed ? (
                                            <>
                                              <CheckCircle2 size={12} />
                                              Completed
                                            </>
                                          ) : accessible ? (
                                            <>
                                              <Circle size={10} />
                                              Ready to start
                                            </>
                                          ) : (
                                            <>
                                              <Lock size={12} />
                                              Locked
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {!disabled && (
                                    <span className="text-xs font-semibold uppercase tracking-widest text-[var(--primary-cyan)]">
                                      {completed ? 'Review' : 'Start'}
                                    </span>
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
  )
}

