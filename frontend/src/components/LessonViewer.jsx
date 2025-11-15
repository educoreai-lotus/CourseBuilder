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
  Lock
} from 'lucide-react'
import Button from './Button.jsx'

const renderContent = (lesson) => {
  // ⚠️ content_data is Content Studio contents[] array - ALWAYS an array
  const contentData = lesson?.content_data
  
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
  // Each item in the array is a content block (text_audio, code, presentation, audio, mind_map, avatar_video)
  if (Array.isArray(contentData)) {
    return (
      <div className="space-y-6">
        {contentData.map((item, idx) => {
          // Handle different Content Studio content types
          if (item.type === 'text_audio' || item.type === 'text') {
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
                {item.audio && (
                  <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4">
                    <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Audio Content</p>
                    <audio controls className="w-full">
                      <source src={item.audio} type="audio/mpeg" />
                      Your browser does not support audio.
                    </audio>
                  </div>
                )}
              </div>
            )
          }
          
          if (item.type === 'code' || item.type === 'codeblock') {
            return (
              <pre
                key={idx}
                className="overflow-auto rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-primary)]"
              >
                <code>{item.content || item.code || item.text}</code>
              </pre>
            )
          }
          
          if (item.type === 'presentation' || item.type === 'avatar_video') {
            return (
              <div key={idx} className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                  {item.type === 'presentation' ? 'Presentation' : 'Video Content'}
                </p>
                {item.url && (
                  <iframe
                    src={item.url}
                    className="h-[400px] w-full rounded-xl"
                    allowFullScreen
                    title={item.title || 'Content'}
                  />
                )}
                {item.content && (
                  <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">{item.content}</p>
                )}
              </div>
            )
          }
          
          if (item.type === 'paragraph' || item.type === 'text') {
            return (
              <p key={idx} className="text-base leading-7 text-[var(--text-secondary)] whitespace-pre-wrap">
                {item.content || item.text}
              </p>
            )
          }
          
          if (item.type === 'list' || item.type === 'ul' || item.type === 'ol') {
            const ListTag = item.ordered ? 'ol' : 'ul'
            return (
              <ListTag key={idx} className="ml-6 list-disc space-y-2 text-[var(--text-secondary)]">
                {(item.items || item.content || []).map((listItem, listIdx) => (
                  <li key={listIdx}>{typeof listItem === 'string' ? listItem : listItem.content || JSON.stringify(listItem)}</li>
                ))}
              </ListTag>
            )
          }
          
          // Fallback for unknown content types
          return (
            <div key={idx} className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4 text-sm text-[var(--text-secondary)]">
              <p className="mb-2 font-semibold text-[var(--text-primary)]">Content ({item.type || 'unknown'})</p>
              {item.content && <p>{item.content}</p>}
              {item.text && <p>{item.text}</p>}
              {!item.content && !item.text && <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(item, null, 2)}</pre>}
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
  canTakeTest = false,
  isFinalLesson = false
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
              <Button variant={canTakeTest ? 'primary' : 'secondary'} onClick={onTakeTest} disabled={!canTakeTest}>
                {canTakeTest ? (
                  <>
                    Take assessment
                    <GraduationCap className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Complete lesson
                    <Lock className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-secondary)]/40 p-6 shadow-inner backdrop-blur">
        {renderContent(lesson)}

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

      <div className="flex flex-col gap-3 border-t border-[rgba(148,163,184,0.14)] pt-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
          <span className="rounded-full bg-[rgba(14,165,233,0.12)] p-2 text-[var(--primary-cyan)]">
            {completed ? <CheckCircle2 size={16} /> : <PlayCircle size={16} />}
          </span>
          {completed ? 'Lesson marked as complete' : 'Mark lesson complete to track progress'}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleComplete} disabled={completed || isProcessing}>
            {completed ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Completed
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark complete
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

