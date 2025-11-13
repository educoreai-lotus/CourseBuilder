import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { CheckCircle2, Circle, Layers, ListChecks, Rocket } from 'lucide-react'
import { getCourseById, validateCourse } from '../services/apiService.js'
import CourseTreeView from '../components/CourseTreeView.jsx'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Container from '../components/Container.jsx'
import { useApp } from '../context/AppContext'
import LessonAssetsPanel from '../components/course/LessonAssetsPanel.jsx'
import EnrichmentButton from '../features/enrichment/components/EnrichmentButton.jsx'

export default function TrainerCourseValidation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [validated, setValidated] = useState(false)
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [assetData, setAssetData] = useState(null)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetError, setAssetError] = useState(null)

  // Note: assetLoading and assetError are managed by EnrichmentButton internally
  // We keep them here for compatibility with LessonAssetsPanel

  useEffect(() => {
    loadCourse()
  }, [id])

  const loadCourse = async () => {
    setLoading(true)
    try {
      const data = await getCourseById(id)
      setCourse(data)
      setValidated(data.status === 'validated')
      const lessons = flattenLessons(data)
      if (lessons.length > 0) {
        setSelectedLessonId(String(lessons[0].id || lessons[0].lesson_id))
      } else {
        setSelectedLessonId('')
      }
    } catch (err) {
      showToast('Failed to load course', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async () => {
    try {
      await validateCourse(id)
      setValidated(true)
      showToast('Course validated successfully! Ready for publishing.', 'success')
      // Reload course to get updated status
      await loadCourse()
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to validate course'
      showToast(message, 'error')
    }
  }

  const lessons = useMemo(() => flattenLessons(course), [course])

  const selectedLesson = useMemo(() => {
    if (!selectedLessonId) return null
    return lessons.find(
      (lesson) => String(lesson.id || lesson.lesson_id) === String(selectedLessonId)
    ) || null
  }, [lessons, selectedLessonId])

  const enrichmentAssetDescriptor = useMemo(() => {
    if (!course || !selectedLesson) {
      return null
    }

    const {
      lesson_name,
      title,
      name,
      description,
      summary,
      content_type,
      metadata = {},
      enriched_content = {}
    } = selectedLesson

    return {
      type: content_type || 'lesson',
      title: title || lesson_name || name,
      description: description || summary || metadata.description,
      metadata: {
        course_id: course.id || course.course_id,
        course_title: course.title || course.course_name,
        skills: course?.metadata?.skills,
        lesson_skills: selectedLesson.micro_skills,
        tags: enriched_content?.tags
      }
    }
  }, [course, selectedLesson])

  // Enrichment is now on-demand only (triggered by EnrichmentButton)
  // Removed automatic useEffect that was calling fetchEnrichmentAssets

  const handleManualEnrichment = useCallback(
    (response) => {
      setAssetData(response)
      setAssetError(null)
      if (response) {
        showToast('AI enrichment refreshed for the selected lesson.', 'success')
      }
    },
    [showToast]
  )

  const handleEnrichmentLoading = useCallback((isLoading) => {
    setAssetLoading(isLoading)
  }, [])

  const handleEnrichmentError = useCallback((err) => {
    setAssetError(err)
    if (err) {
      setAssetData(null)
    }
  }, [])

  const checklist = useMemo(() => {
    if (!course) return []
    return [
      {
        label: 'Course structure is complete',
        checked: (course.modules || []).length > 0
      },
      {
        label: 'All modules have supporting lessons',
        checked: (course.modules || []).every((module) => (module.lessons || []).length > 0)
      },
      {
        label: 'Course description is provided',
        checked: Boolean(course.description || course.course_description)
      },
      {
        label: 'Difficulty level is assigned',
        checked: Boolean(course.level)
      },
      {
        label: 'Metadata & enrichment applied',
        checked: Boolean(course.metadata)
      }
    ]
  }, [course])

  if (loading) {
    return (
      <div className="page-surface">
        <Container>
          <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-card)] p-10 shadow-sm backdrop-blur">
            <LoadingSpinner message="Loading course..." />
          </div>
        </Container>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="page-surface">
        <Container>
          <section className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-3xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-card)] p-10 text-center shadow-sm backdrop-blur">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Course not found</h2>
            <p className="max-w-md text-sm text-[var(--text-secondary)]">
              Try returning to the trainer dashboard and selecting a course again.
            </p>
            <Button variant="primary" onClick={() => navigate('/trainer/dashboard')}>
              Back to dashboard
            </Button>
          </section>
        </Container>
      </div>
    )
  }

  return (
    <div className="page-surface">
      <Container>
        <div className="flex flex-col gap-10 py-10">
          <header className="flex flex-col gap-6 rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-8 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                <Layers className="h-4 w-4 text-[var(--primary-cyan)]" />
                Validation workspace
              </span>
              <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
                Validate course structure before publishing
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Confirm modules, lessons, and metadata are in place. Once validation is complete you can proceed to
                scheduling and publishing.
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/trainer/dashboard')}>
              Back to dashboard
            </Button>
          </header>

          <article className="flex flex-col gap-5 rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  {course.title || course.course_name}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                  {course.description ||
                    course.course_description ||
                    'Maintain an up-to-date description so learners know exactly what outcomes to expect.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(99,102,241,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#4338ca]">
                    {course.level || 'Beginner'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                      validated
                        ? 'bg-[rgba(16,185,129,0.16)] text-[#047857]'
                        : 'bg-[rgba(234,179,8,0.18)] text-[#b45309]'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {validated ? 'Validated' : 'Pending validation'}
                  </span>
                </div>
              </div>
              {!validated && (
                <Button variant="primary" onClick={handleValidate} className="self-start">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as validated
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-sm font-semibold text-[var(--text-secondary)]">
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Modules</p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {(course.modules || []).length}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-sm font-semibold text-[var(--text-secondary)]">
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Lessons</p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {(course.modules || []).reduce((total, module) => total + (module.lessons?.length || 0), 0)}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--bg-secondary)]/40 p-4 text-sm font-semibold text-[var(--text-secondary)]">
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Last updated</p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {course.updated_at ? new Date(course.updated_at).toLocaleDateString() : 'Recently'}
                </p>
              </div>
            </div>
          </article>

          <section className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur">
            <header className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Course structure preview</h2>
              <Layers className="h-5 w-5 text-[var(--primary-cyan)]" />
            </header>
            <CourseTreeView modules={course.modules || []} courseId={id} />
          </section>

          <section className="flex flex-col gap-5 rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur">
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  AI asset sandbox
                </h2>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  Review enrichment assets for individual lessons to ensure learners receive fresh, high-quality practice materials.
                </p>
              </div>
              <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)] md:flex-row md:items-center md:gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="trainer-lesson-selector" className="font-semibold text-[var(--text-primary)]">
                    Select lesson
                  </label>
                  <select
                    id="trainer-lesson-selector"
                    value={selectedLessonId}
                    onChange={(event) => setSelectedLessonId(event.target.value)}
                    className="rounded-full border border-[rgba(148,163,184,0.35)] bg-[var(--bg-primary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm focus:border-[var(--primary-cyan)] focus:outline-none"
                    disabled={lessons.length === 0}
                  >
                    {lessons.map((lesson) => {
                      const lessonId = String(lesson.id || lesson.lesson_id)
                      const label =
                        lesson.title ||
                        lesson.lesson_name ||
                        lesson.name ||
                        `Lesson ${lessonId.slice(0, 6)}`
                      const moduleLabel = lesson.moduleName ? ` · ${lesson.moduleName}` : ''

                      return (
                        <option key={lessonId} value={lessonId}>
                          {label}
                          {moduleLabel}
                        </option>
                      )
                    })}
                    {lessons.length === 0 && <option value="">No lessons available</option>}
                  </select>
                </div>
                <EnrichmentButton
                  asset={enrichmentAssetDescriptor}
                  onResults={handleManualEnrichment}
                  onLoading={handleEnrichmentLoading}
                  onError={handleEnrichmentError}
                  disabled={!enrichmentAssetDescriptor}
                  buttonLabel="Regenerate assets"
                  className="self-start"
                />
              </div>
            </header>

            <LessonAssetsPanel
              assets={assetData}
              loading={assetLoading}
              error={assetError}
            />
          </section>

          <section className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur">
            <header className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Validation checklist</h2>
              <ListChecks className="h-5 w-5 text-[var(--primary-cyan)]" />
            </header>
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className={`flex items-center gap-3 rounded-2xl border border-[rgba(148,163,184,0.18)] px-4 py-3 text-sm ${
                    item.checked ? 'bg-[rgba(16,185,129,0.1)] text-[#047857]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {item.checked ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4 text-[var(--text-muted)]" />
                  )}
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" onClick={() => navigate(`/trainer/publish/${id}`)} disabled={!validated}>
              <Rocket className="mr-2 h-4 w-4" />
              Proceed to publishing
            </Button>
            <Button variant="secondary" onClick={() => navigate('/trainer/dashboard')}>
              Save & return
            </Button>
          </div>
        </div>
      </Container>
    </div>
  )
}

const flattenLessons = (course) => {
  if (!course) return []

  const result = []

  if (Array.isArray(course.topics) && course.topics.length > 0) {
    course.topics.forEach((topic) => {
      const topicName = topic.topicName || topic.topic_name || topic.name
      const topicModules = Array.isArray(topic.modules) ? topic.modules : []
      topicModules.forEach((module) => {
        const moduleLessons = Array.isArray(module.lessons) ? module.lessons : []
        moduleLessons.forEach((lesson) => {
          result.push({
            ...lesson,
            topicName,
            moduleName: module.module_name || module.name || module.title || topicName
          })
        })
      })
    })
    return result
  }

  if (Array.isArray(course.modules) && course.modules.length > 0) {
    course.modules.forEach((module) => {
      const moduleLessons = Array.isArray(module.lessons) ? module.lessons : []
      moduleLessons.forEach((lesson) => {
        result.push({
          ...lesson,
          topicName: module.topic_name || module.topicName,
          moduleName: module.module_name || module.name || module.title || module.topic_name
        })
      })
    })
    return result
  }

  if (Array.isArray(course.lessons)) {
    return course.lessons.map((lesson) => ({ ...lesson }))
  }

  return result
}

