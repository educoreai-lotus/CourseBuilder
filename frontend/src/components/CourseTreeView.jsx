import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from './Button.jsx'

export default function CourseTreeView({ modules, courseId, onLessonClick }) {
  const [expandedModules, setExpandedModules] = useState({})

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }))
  }

  if (!modules || modules.length === 0) {
    return (
      <div style={{
        padding: 'var(--spacing-xl)',
        textAlign: 'center',
        color: 'var(--text-muted)'
      }}>
        <i className="fas fa-book-open" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)' }}></i>
        <p>No modules available yet.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {modules.map((module, idx) => {
        const moduleId = module.id || `module-${idx}`
        const isExpanded = expandedModules[moduleId]
        const lessons = module.lessons || []

        return (
          <div key={moduleId} style={{ borderRadius: '8px', border: '1px solid rgba(148,163,184,0.12)', background: 'var(--bg-card)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                transition: 'background 0.2s'
              }}
              onClick={() => toggleModule(moduleId)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div className="card-icon" style={{ width: '32px', height: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'rgba(14,165,233,0.12)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-cyan)' }}>{idx + 1}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {module.title || module.name || `Module ${idx + 1}`}
                </h3>
                {module.description && (
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {module.description}
                  </p>
                )}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                color: 'var(--text-secondary)'
              }}>
                {lessons.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {lessons.length}
                  </span>
                )}
                <i
                  className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}
                  style={{ transition: 'transform 0.2s', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                ></i>
              </div>
            </div>

            {isExpanded && lessons.length > 0 && (
              <div style={{
                marginLeft: '40px',
                marginTop: '8px',
                paddingLeft: '12px',
                borderLeft: '2px solid var(--bg-tertiary)'
              }}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {lessons.map((lesson, lessonIdx) => {
                    const lessonId = lesson.id || `lesson-${lessonIdx}`
                    return (
                      <li
                        key={lessonId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-secondary)'
                          e.currentTarget.style.transform = 'translateX(2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.transform = 'translateX(0)'
                        }}
                      >
                        <i className="fas fa-play-circle" style={{ color: 'var(--primary-cyan)', fontSize: '0.875rem', flexShrink: 0 }}></i>
                        <Link
                          to={onLessonClick || !courseId ? `#` : `/course/${courseId}/lesson/${lessonId}`}
                          onClick={(e) => {
                            if (onLessonClick) {
                              e.preventDefault()
                              onLessonClick(lesson)
                            }
                          }}
                          style={{
                            flex: 1,
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                            fontSize: '0.8125rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: 0
                          }}
                        >
                          {lesson.title || lesson.lesson_name || `Lesson ${lessonIdx + 1}`}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

