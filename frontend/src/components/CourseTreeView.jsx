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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {modules.map((module, idx) => {
        const moduleId = module.id || `module-${idx}`
        const isExpanded = expandedModules[moduleId]
        const lessons = module.lessons || []

        return (
          <div key={moduleId} className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                cursor: 'pointer',
                padding: 'var(--spacing-sm)',
                borderRadius: 'var(--radius-sm)',
                transition: 'background 0.2s'
              }}
              onClick={() => toggleModule(moduleId)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div className="card-icon" style={{ width: '50px', height: '50px', flexShrink: 0 }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{idx + 1}</span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  {module.title || module.name || `Module ${idx + 1}`}
                </h3>
                {module.description && (
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
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
                  <span style={{ fontSize: '0.9rem' }}>
                    {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                  </span>
                )}
                <i
                  className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}
                  style={{ transition: 'transform 0.2s' }}
                ></i>
              </div>
            </div>

            {isExpanded && lessons.length > 0 && (
              <div style={{
                marginLeft: '60px',
                marginTop: 'var(--spacing-md)',
                paddingLeft: 'var(--spacing-md)',
                borderLeft: '2px solid var(--bg-tertiary)'
              }}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                  {lessons.map((lesson, lessonIdx) => {
                    const lessonId = lesson.id || `lesson-${lessonIdx}`
                    return (
                      <li
                        key={lessonId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-sm)',
                          padding: 'var(--spacing-sm)',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-secondary)'
                          e.currentTarget.style.transform = 'translateX(4px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.transform = 'translateX(0)'
                        }}
                      >
                        <i className="fas fa-play-circle" style={{ color: 'var(--primary-cyan)', fontSize: '1.1rem' }}></i>
                        <Link
                          to={onLessonClick ? `#` : `/lessons/${lessonId}`}
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
                            fontSize: '0.95rem'
                          }}
                        >
                          {lesson.title || lesson.lesson_name || `Lesson ${lessonIdx + 1}`}
                        </Link>
                        {lesson.content_type && (
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 6px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-muted)',
                            textTransform: 'capitalize'
                          }}>
                            {lesson.content_type}
                          </span>
                        )}
                        {lesson.duration && (
                          <span style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)'
                          }}>
                            <i className="fas fa-clock mr-1"></i>
                            {lesson.duration}min
                          </span>
                        )}
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

