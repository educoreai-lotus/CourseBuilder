import { useEffect, useState } from 'react'
import Button from './Button.jsx'

/**
 * Render lesson content based on content_data structure
 * Supports Content Studio JSON format
 */
function renderContent(lesson) {
  if (!lesson.content_data || Object.keys(lesson.content_data).length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--spacing-xl)' }}>
        <i className="fas fa-file-alt" style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}></i>
        <p>No content available for this lesson.</p>
      </div>
    )
  }

  const contentData = lesson.content_data

  // If content_data has a content_ref, display it
  if (contentData.content_ref) {
    return (
      <div>
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <strong>Content Reference:</strong> {contentData.content_ref}
        </div>
        {contentData.text && (
          <div style={{ whiteSpace: 'pre-wrap' }}>{contentData.text}</div>
        )}
        {contentData.html && (
          <div dangerouslySetInnerHTML={{ __html: contentData.html }} />
        )}
      </div>
    )
  }

  // If content_data has text directly
  if (contentData.text) {
    return <div style={{ whiteSpace: 'pre-wrap' }}>{contentData.text}</div>
  }

  // If content_data has HTML
  if (contentData.html) {
    return <div dangerouslySetInnerHTML={{ __html: contentData.html }} />
  }

  // If content_data is an array (Content Studio format)
  if (Array.isArray(contentData)) {
    return (
      <div>
        {contentData.map((item, idx) => {
          if (item.type === 'text' || item.type === 'paragraph') {
            return (
              <p key={idx} style={{ marginBottom: 'var(--spacing-md)' }}>
                {item.content || item.text}
              </p>
            )
          }
          if (item.type === 'heading' || item.type === 'h1' || item.type === 'h2' || item.type === 'h3') {
            const HeadingTag = item.level ? `h${item.level}` : 'h2'
            return (
              <HeadingTag key={idx} style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                {item.content || item.text}
              </HeadingTag>
            )
          }
          if (item.type === 'list' || item.type === 'ul' || item.type === 'ol') {
            const ListTag = item.ordered ? 'ol' : 'ul'
            return (
              <ListTag key={idx} style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-lg)' }}>
                {(item.items || []).map((listItem, listIdx) => (
                  <li key={listIdx}>{listItem}</li>
                ))}
              </ListTag>
            )
          }
          if (item.type === 'code' || item.type === 'codeblock') {
            return (
              <pre key={idx} style={{
                background: 'var(--bg-primary)',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'auto',
                marginBottom: 'var(--spacing-md)'
              }}>
                <code>{item.content || item.code}</code>
              </pre>
            )
          }
          return (
            <div key={idx} style={{ marginBottom: 'var(--spacing-md)' }}>
              {item.content || JSON.stringify(item)}
            </div>
          )
        })}
      </div>
    )
  }

  // Fallback: display as JSON
  return (
    <div>
      <pre style={{
        background: 'var(--bg-primary)',
        padding: 'var(--spacing-md)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'auto',
        fontSize: '0.9rem'
      }}>
        {JSON.stringify(contentData, null, 2)}
      </pre>
    </div>
  )
}

export default function LessonViewer({ lesson, onNext, onPrevious, onComplete, isCompleted = false }) {
  const [completed, setCompleted] = useState(isCompleted)

  useEffect(() => {
    setCompleted(isCompleted)
  }, [isCompleted])

  const [isProcessing, setProcessing] = useState(false)

  if (!lesson) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
        <i className="fas fa-book-open" style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}></i>
        <p>No lesson content available</p>
      </div>
    )
  }

  const handleComplete = async () => {
    if (completed || isProcessing) {
      return
    }

    setProcessing(true)
    try {
      if (onComplete) {
        const result = await onComplete(lesson)
        if (result === false) {
          setProcessing(false)
          return
        }
      }
      setCompleted(true)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="card">
      {/* Lesson Header */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-md)'
        }}>
          <div className="card-icon" style={{ width: '60px', height: '60px' }}>
            <i className="fas fa-book-open"></i>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: 600,
              marginBottom: 'var(--spacing-xs)',
              color: 'var(--text-primary)'
            }}>
              {lesson.title || lesson.lesson_name || 'Lesson'}
            </h2>
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              alignItems: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              {lesson.duration && (
                <span>
                  <i className="fas fa-clock mr-2"></i>
                  {lesson.duration} minutes
                </span>
              )}
              {lesson.content_type && (
                <span style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  textTransform: 'capitalize'
                }}>
                  {lesson.content_type}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Content */}
      <div style={{
        padding: 'var(--spacing-xl)',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--spacing-lg)',
        minHeight: '300px',
        lineHeight: 1.8,
        color: 'var(--text-primary)'
      }}>
        {renderContent(lesson)}

        {/* Enrichment Data */}
        {lesson.enrichment_data && (
          <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--bg-tertiary)' }}>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: 'var(--spacing-md)',
              color: 'var(--text-primary)'
            }}>
              Additional Resources
            </h4>
            {lesson.enrichment_data.youtube_links && lesson.enrichment_data.youtube_links.length > 0 && (
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-xs)' }}>
                  <i className="fab fa-youtube mr-2" style={{ color: '#FF0000' }}></i>
                  YouTube Videos
                </div>
                <ul style={{ listStyle: 'none', paddingLeft: 'var(--spacing-md)' }}>
                  {lesson.enrichment_data.youtube_links.map((link, idx) => (
                    <li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--primary-cyan)',
                          textDecoration: 'none'
                        }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lesson.enrichment_data.github_repos && lesson.enrichment_data.github_repos.length > 0 && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-xs)' }}>
                  <i className="fab fa-github mr-2"></i>
                  GitHub Repositories
                </div>
                <ul style={{ listStyle: 'none', paddingLeft: 'var(--spacing-md)' }}>
                  {lesson.enrichment_data.github_repos.map((repo, idx) => (
                    <li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>
                      <a
                        href={repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--primary-cyan)',
                          textDecoration: 'none'
                        }}
                      >
                        {repo}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {(lesson.micro_skills || lesson.nano_skills) && (
          <div style={{
            marginTop: 'var(--spacing-lg)',
            paddingTop: 'var(--spacing-lg)',
            borderTop: '1px solid var(--bg-tertiary)'
          }}>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: 'var(--spacing-md)',
              color: 'var(--text-primary)'
            }}>
              Learning Objectives
            </h4>
            {lesson.micro_skills && (
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-sm)' }}>
                  Micro Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                  {lesson.micro_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        background: 'rgba(0, 166, 118, 0.1)',
                        color: 'var(--primary-emerald)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem'
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {lesson.nano_skills && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-sm)' }}>
                  Nano Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                  {lesson.nano_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem'
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--spacing-md)',
        paddingTop: 'var(--spacing-lg)',
        borderTop: '1px solid var(--bg-tertiary)'
      }}>
        <Button
          variant="secondary"
          onClick={onPrevious}
          disabled={!onPrevious}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Previous
        </Button>
        <Button
          variant="primary"
          onClick={handleComplete}
          disabled={completed || isProcessing}
        >
          {completed ? (
            <>
              <i className="fas fa-check-circle mr-2"></i>
              Completed
            </>
          ) : (
            <>
              <i className="fas fa-check mr-2"></i>
              Mark Complete
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={onNext}
          disabled={!onNext}
        >
          Next
          <i className="fas fa-arrow-right ml-2"></i>
        </Button>
      </div>
    </div>
  )
}

