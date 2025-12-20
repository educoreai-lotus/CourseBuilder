import { useEffect, useState } from 'react'
import {
  BookOpen,
  Clock,
  Youtube,
  Github,
  CheckCircle2,
  PlayCircle,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Lock,
  Code
} from 'lucide-react'
import Button from './Button.jsx'
import { MindMapViewer } from './MindMapViewer.jsx'

const renderContent = (lesson) => {
  // Handle content_data - can be array, object, or JSON string
  let contentData = lesson?.content_data
  console.log('🔥 LESSON VIEW RENDERED 🔥');

  // Parse if it's a JSON string
  if (typeof contentData === 'string') {
    try {
      contentData = JSON.parse(contentData)
    } catch (e) {
      console.warn('[LessonViewer] Failed to parse content_data as JSON:', e)
      // If parsing fails, treat as plain text
      return (
        <div className="space-y-6">
          <p className="text-base leading-7 text-[var(--text-secondary)] whitespace-pre-wrap">{contentData}</p>
        </div>
      )
    }
  }
  
  // Check if content_data exists and is not empty
  if (!contentData || (Array.isArray(contentData) && contentData.length === 0) || (typeof contentData === 'object' && Object.keys(contentData).length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-[var(--text-muted)]">
        <BookOpen className="h-10 w-10" />
        <p className="text-sm">No content available for this lesson yet.</p>
      </div>
    )
  }

  // ⚠️ content_data is ALWAYS an array (Content Studio contents[] array)
  // Each item in the array can be:
  // 1. Direct format: { type: "...", text: "...", ... }
  // 2. Nested format: { content_data: {...}, content_type: "..." }
  if (Array.isArray(contentData)) {
    // Normalize the array - handle both direct and nested formats
    const normalizedContent = contentData.map(item => {
      // If item has nested content_data and content_type, extract them
      if (item.content_data && item.content_type) {
        return {
          ...item.content_data, // Spread the actual content
          content_type: item.content_type, // Keep content_type at top level
          type: item.content_type // Also set type for compatibility
        }
      }
      // Otherwise, use item as-is (direct format)
      return {
        ...item,
        content_type: item.content_type || item.type,
        type: item.type || item.content_type
      }
    })

    // Use format_order if available, otherwise use normalizedContent order
    const formatOrder = lesson?.format_order || []
    const orderedContent = formatOrder.length > 0 
      ? formatOrder.map(formatType => {
          // Find matching content item by content_type
          const matchingItem = normalizedContent.find(item => {
            const itemType = item.content_type || item.type
            return itemType === formatType || 
                   (formatType === 'text' && (itemType === 'text' || itemType === 'text_audio')) ||
                   (formatType === 'text_audio' && (itemType === 'text' || itemType === 'text_audio'))
          })
          return matchingItem ? { ...matchingItem, _formatType: formatType } : null
        }).filter(Boolean)
      : normalizedContent

    return (
      <div className="space-y-6">
        {orderedContent.map((item, idx) => {
          // Get content type - check both 'type' and 'content_type' fields
          const contentType = item.content_type || item.type || item._formatType
          
          // Handle different Content Studio content types
          if (contentType === 'text_audio' || contentType === 'text') {
            return (
              <div key={idx} className="space-y-4">
                {item.text && (
                  <p className="text-base leading-7 text-[var(--text-secondary)] whitespace-pre-wrap">{item.text}</p>
                )}
                {item.html && (
                  <div
                    className="prose prose-slate max-w-none text-[var(--text-secondary)]"
                    dangerouslySetInnerHTML={{ __html: item.html }}
                  />
                )}
                {(item.audio || item.audioUrl) && (
                  <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4">
                    <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Audio Content</p>
                    <audio controls className="w-full">
                      <source src={item.audioUrl || item.audio} type={`audio/${item.audioFormat || 'mp3'}`} />
                      Your browser does not support audio.
                    </audio>
                    {item.audioDuration && (
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        Duration: {Math.round(item.audioDuration)}s
                      </p>
                    )}
                    {item.audioVoice && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Voice: {item.audioVoice}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          }
          
          if (contentType === 'code' || contentType === 'codeblock') {
            return (
              <pre
                key={idx}
                className="overflow-auto rounded-2xl border border-[rgba(148,163,184,0.18)] p-4 text-sm"
                style={{
                  backgroundColor: '#000000',
                  color: '#00ff00',
                }}
              >
                <code style={{ color: '#00ff00' }}>{item.content || item.code || item.text}</code>
              </pre>
            )
          }
          
          if (contentType === 'presentation') {
            return (
              <div key={idx} className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Presentation</p>
                {(item.presentationUrl || item.url) && (
                  <div className="space-y-3">
                    {item.presentationUrl && (
                      <a
                        href={item.presentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-block px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors mb-3"
                      >
                        Download Presentation
                      </a>
                    )}
                    {item.url && (
                      <iframe
                        src={item.url}
                        className="h-[400px] w-full rounded-xl"
                        allowFullScreen
                        title={item.title || 'Content'}
                      />
                    )}
                  </div>
                )}
                {item.content && (
                  <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">{item.content}</p>
                )}
              </div>
            )
          }
          
          if (contentType === 'avatar_video') {
            const videoUrl = item.videoUrl || item.fileUrl
            
            return (
              <div key={idx} className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Video Content</p>
                {videoUrl ? (
                  <div className="bg-black rounded-lg overflow-hidden shadow-2xl aspect-video">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full"
                      onError={(e) => {
                        console.error('[AvatarVideo] Video load error:', e)
                        console.error('[AvatarVideo] Video src:', videoUrl)
                      }}
                    />
                  </div>
                ) : item.videoId ? (
                  <a
                    href={`https://app.heygen.com/share/${item.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Open avatar video
                  </a>
                ) : (
                  <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
                    <p className="text-sm text-[var(--text-muted)]">No video content available</p>
                  </div>
                )}
              </div>
            )
          }
          
          if (contentType === 'paragraph') {
            return (
              <p key={idx} className="text-base leading-7 text-[var(--text-secondary)] whitespace-pre-wrap">
                {item.content || item.text}
              </p>
            )
          }
          
          if (contentType === 'list' || contentType === 'ul' || contentType === 'ol') {
            const ListTag = item.ordered ? 'ol' : 'ul'
            return (
              <ListTag key={idx} className="ml-6 list-disc space-y-2 text-[var(--text-secondary)]">
                {(item.items || item.content || []).map((listItem, listIdx) => (
                  <li key={listIdx}>{typeof listItem === 'string' ? listItem : listItem.content || JSON.stringify(listItem)}</li>
                ))}
              </ListTag>
            )
          }
          
          // Handle mind_map type
          if (contentType === 'mind_map') {
            return (
              <div key={idx} className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4">
                <p className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Mind Map</p>
                {item.nodes && item.edges ? (
                  <MindMapViewer data={{ nodes: item.nodes, edges: item.edges }} />
                ) : (
                  <div className="text-sm text-[var(--text-secondary)] p-4 text-center">
                    <p>Mind map data available but structure is invalid</p>
                  </div>
                )}
              </div>
            )
          }
          
          // Fallback for unknown content types - try to render useful content
          return (
            <div key={idx} className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4 text-sm text-[var(--text-secondary)]">
              <p className="mb-2 font-semibold text-[var(--text-primary)]">Content ({contentType || 'unknown'})</p>
              {item.content && <p className="whitespace-pre-wrap">{item.content}</p>}
              {item.text && <p className="whitespace-pre-wrap">{item.text}</p>}
              {item.html && (
                <div 
                  className="prose prose-slate max-w-none text-[var(--text-secondary)]"
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              )}
              {!item.content && !item.text && !item.html && (
                <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(item, null, 2)}</pre>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Fallback for legacy object format (shouldn't happen with new schema)
  if (typeof contentData === 'object' && contentData !== null) {
    if (contentData.content_ref) {
      return (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4 text-sm shadow-sm backdrop-blur transition-colors">
            <strong className="text-[var(--text-primary)]">Content Reference:</strong>{' '}
            <span className="text-[var(--text-secondary)]">{contentData.content_ref}</span>
          </div>
          {contentData.text && (
            <p className="text-base leading-7 text-[var(--text-secondary)] whitespace-pre-wrap">{contentData.text}</p>
          )}
        </div>
      )
    }
  }

  return (
    <pre className="overflow-auto rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-primary)]">
      {JSON.stringify(contentData, null, 2)}
    </pre>
  )
}

export default function LessonViewer({
  lesson,
  onNext,
  onPrevious,
  onComplete,
  isCompleted = false,
  onTakeTest,
  isFinalLesson = false,
  onViewExercises,
  courseId
}) {
  const [completed, setCompleted] = useState(isCompleted)
  const [isProcessing, setProcessing] = useState(false)

  useEffect(() => {
    setCompleted(isCompleted)
  }, [isCompleted])

  if (!lesson) {
    return (
      <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/90 p-12 text-center shadow-sm backdrop-blur transition-colors text-[var(--text-secondary)]">
        <BookOpen className="mx-auto mb-4 h-10 w-10 text-[var(--text-muted)]" />
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
    <div className="space-y-6">
      <div className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/95 p-6 shadow-sm backdrop-blur transition-colors">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-[rgba(14,165,233,0.12)] p-3 text-[var(--primary-cyan)]">
              <BookOpen size={22} />
            </span>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {lesson.title || lesson.lesson_name || 'Lesson'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {lesson.subtitle ||
                  lesson.summary ||
                  'Master the concepts through guided explanations, practical steps, and curated resources.'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {lesson.duration && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {typeof lesson.duration === 'string' ? lesson.duration : `${lesson.duration} mins`}
                  </span>
                )}
                {lesson.content_type && (
                  <span className="flex items-center gap-1 text-[var(--primary-cyan)]">
                    <PlayCircle size={12} />
                    {lesson.content_type}
                  </span>
                )}
                {completed && (
                  <span className="flex items-center gap-1 text-[#047857]">
                    <CheckCircle2 size={12} />
                    Completed
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onPrevious} disabled={!onPrevious}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            {onNext && !isFinalLesson && (
              <Button variant="secondary" onClick={onNext} disabled={!onNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {isFinalLesson && onTakeTest && (
              <Button variant="primary" onClick={onTakeTest}>
                <GraduationCap className="ml-2 h-4 w-4" />
                Take assessment
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-secondary)]/40 p-6 shadow-inner backdrop-blur">
        {renderContent(lesson)}

        {/* DevLab Exercises - Show button to navigate to exercises page */}
        {lesson.devlab_exercises && Array.isArray(lesson.devlab_exercises) && lesson.devlab_exercises.length > 0 && (
          <div className="mt-8 rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/90 p-6 shadow-sm backdrop-blur transition-colors">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[rgba(14,165,233,0.12)] p-3 text-[var(--primary-cyan)]">
                  <Code size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Practice Exercises Available
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {lesson.devlab_exercises.length} {lesson.devlab_exercises.length === 1 ? 'exercise' : 'exercises'} ready for hands-on practice
                  </p>
                </div>
              </div>
              {onViewExercises && (
                <Button variant="primary" onClick={onViewExercises}>
                  <Code className="mr-2 h-4 w-4" />
                  Start Exercises
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {(lesson.enrichment_data || lesson.micro_skills || lesson.nano_skills) && (
          <div className="mt-8 space-y-6">
            {lesson.enrichment_data && (
              <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-5 shadow-sm backdrop-blur transition-colors">
                <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Additional resources</h3>
                <div className="space-y-4 text-sm">
                  {Array.isArray(lesson.enrichment_data.youtube_links) && lesson.enrichment_data.youtube_links.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
                        <Youtube size={16} className="text-[#FF0000]" />
                        YouTube
                      </div>
                      <ul className="space-y-2 pl-5 text-[var(--text-secondary)]">
                        {lesson.enrichment_data.youtube_links.map((link, idx) => (
                          <li key={idx}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--primary-cyan)] underline-offset-2 hover:underline"
                            >
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(lesson.enrichment_data.github_repos) && lesson.enrichment_data.github_repos.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
                        <Github size={16} />
                        GitHub
                      </div>
                      <ul className="space-y-2 pl-5 text-[var(--text-secondary)]">
                        {lesson.enrichment_data.github_repos.map((repo, idx) => (
                          <li key={idx}>
                            <a
                              href={repo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--primary-cyan)] underline-offset-2 hover:underline"
                            >
                              {repo}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(lesson.micro_skills || lesson.nano_skills) && (
              <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-5 shadow-sm backdrop-blur transition-colors">
                <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Learning objectives</h3>
                <div className="space-y-4 text-sm text-[var(--text-secondary)]">
                  {lesson.micro_skills && (
                    <div>
                      <div className="mb-2 font-semibold text-[var(--text-primary)]">Micro skills</div>
                      <div className="flex flex-wrap gap-2">
                        {lesson.micro_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-[rgba(16,185,129,0.12)] px-3 py-1 text-xs font-semibold text-[#047857]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {lesson.nano_skills && (
                    <div>
                      <div className="mb-2 font-semibold text-[var(--text-primary)]">Nano skills</div>
                      <div className="flex flex-wrap gap-2">
                        {lesson.nano_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-[rgba(14,165,233,0.12)] px-3 py-1 text-xs font-semibold text-[#0f766e]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

