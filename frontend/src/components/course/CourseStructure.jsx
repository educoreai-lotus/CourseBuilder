import { useMemo, useState } from 'react'

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
        lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
          id: String(lesson.id || lesson.lesson_id || `lesson-${lessonIndex}`),
          title: lesson.title || lesson.lesson_name || `Lesson ${lessonIndex + 1}`,
          duration: lesson.duration || lesson.estimated_duration || 12,
          status: lesson.status || 'locked',
          icon: lesson.icon || 'fa-lightbulb'
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
        lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
          id: String(lesson.id || lesson.lesson_id || `lesson-${lessonIndex}`),
          title: lesson.title || lesson.lesson_name || `Lesson ${lessonIndex + 1}`,
          duration: lesson.duration || lesson.estimated_duration || 12,
          status: lesson.status || 'locked',
          icon: lesson.icon || 'fa-lightbulb'
        }))
      }))
    }
  ]
}

export default function CourseStructure({
  course,
  onSelectLesson,
  completedLessonIds = [],
  unlocked = false
}) {
  const hierarchy = useMemo(() => normalizeHierarchy(course), [course])
  const [expandedTopics, setExpandedTopics] = useState(() => new Set(hierarchy.map(topic => topic.id)))
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

  const renderLessonStatus = (lessonId, status) => {
    if (completedLessonIds.includes(lessonId)) {
      return (
        <span className="status-chip" style={{ background: 'rgba(16,185,129,0.15)', color: '#047857' }}>
          <i className="fa-solid fa-circle-check" />
          Completed
        </span>
      )
    }

    if (unlocked || status === 'unlocked') {
      return (
        <span className="status-chip" style={{ background: 'rgba(59,130,246,0.15)', color: '#1d4ed8' }}>
          <i className="fa-solid fa-unlock" />
          Available
        </span>
      )
    }

    return (
      <span className="status-chip" style={{ background: 'rgba(148,163,184,0.2)', color: '#475569' }}>
        <i className="fa-solid fa-lock" />
        Locked
      </span>
    )
  }

  if (hierarchy.length === 0) {
    return (
      <div className="course-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--spacing-xl)' }}>
        <i className="fa-solid fa-cubes" style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-md)' }} />
        <p>No modules have been published for this course yet.</p>
      </div>
    )
  }

  return (
    <div className="section-panel" style={{ marginTop: 'var(--spacing-xl)' }}>
      <header className="section-heading">
        <div>
          <h2>Course structure</h2>
          <p>Navigate the journey from topic to lesson with guided checkpoints.</p>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {hierarchy.map((topic) => (
          <article key={topic.id} className="course-card">
            <header
              onClick={() => toggleTopic(topic.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                <span className="tag-chip" style={{ width: 'fit-content' }}>
                  <i className="fa-solid fa-layer-group" />
                  Topic
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{topic.title}</h3>
                {topic.summary && <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{topic.summary}</p>}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minWidth: '120px' }}
              >
                <i className={`fa-solid ${expandedTopics.has(topic.id) ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                {expandedTopics.has(topic.id) ? 'Collapse' : 'Expand'}
              </button>
            </header>

            {expandedTopics.has(topic.id) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                {topic.modules.map((module) => (
                  <section key={module.id} className="floating-card">
                    <header
                      onClick={() => toggleModule(module.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                        <div className="card-icon" style={{ width: '48px', height: '48px' }}>
                          <i className="fa-solid fa-puzzle-piece" />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{module.title}</h4>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {(module.lessons?.length || 0)} lesson{module.lessons?.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                      <i className={`fa-solid ${expandedModules.has(module.id) ? 'fa-minus' : 'fa-plus'}`} />
                    </header>

                    {expandedModules.has(module.id) && (
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                        {(module.lessons || []).map((lesson) => {
                          const isCompleted = completedLessonIds.includes(lesson.id)
                          const isAccessible = unlocked || lesson.status === 'unlocked' || isCompleted
                          const isLocked = !isAccessible && lesson.status === 'locked'
                          const label = isCompleted
                            ? 'Review'
                            : completedLessonIds.length > 0
                              ? 'Resume'
                              : 'Start'

                          return (
                            <li
                              key={lesson.id}
                              className="lesson-card"
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 'var(--spacing-md)',
                                alignItems: 'center',
                                padding: 'var(--spacing-md)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-secondary)',
                                border: '1px solid rgba(15,118,110,0.12)'
                              }}
                            >
                              <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                                <span className="card-icon" style={{ width: '40px', height: '40px' }}>
                                  <i className={`fa-solid ${lesson.icon}`} />
                                </span>
                                <div>
                                  <h5 style={{ marginBottom: '4px', fontWeight: 600 }}>{lesson.title}</h5>
                                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <i className="fa-solid fa-clock" style={{ marginRight: '6px' }} />
                                    {lesson.duration} mins · Lesson #{lesson.id.toString().slice(-2)}
                                  </p>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                {renderLessonStatus(lesson.id, lesson.status)}
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => onSelectLesson?.(lesson.id)}
                                  disabled={isLocked}
                                >
                                  <i className="fa-solid fa-play" />
                                  {label}
                                </button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      <footer style={{ marginTop: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <span className="tag-chip" style={{ background: 'rgba(16,185,129,0.12)', color: '#047857' }}>
            <i className="fa-solid fa-wand-magic-sparkles" />
            Adaptive difficulty enabled
          </span>
          <span className="tag-chip" style={{ background: 'rgba(59,130,246,0.12)', color: '#1d4ed8' }}>
            <i className="fa-solid fa-robot" />
            AI enrichment active
          </span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Lessons update dynamically as you progress.
        </div>
      </footer>
    </div>
  )
}

