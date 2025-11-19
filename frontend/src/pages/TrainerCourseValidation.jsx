import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { CheckCircle2, Layers, Rocket, Pencil, Save, X } from 'lucide-react'
import { getCourseById, updateCourse } from '../services/apiService.js'
import CourseTreeView from '../components/CourseTreeView.jsx'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Container from '../components/Container.jsx'
import { useApp } from '../context/AppContext'
import LessonAssetsPanel from '../components/course/LessonAssetsPanel.jsx'
import EnrichmentButton from '../features/enrichment/components/EnrichmentButton.jsx'
import Input from '../components/Input.jsx'

export default function TrainerCourseValidation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [assetData, setAssetData] = useState(null)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetError, setAssetError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    course_name: '',
    course_description: '',
    level: ''
  })
  const [saving, setSaving] = useState(false)

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
      setEditForm({
        course_name: data.course_name || data.title || '',
        course_description: data.course_description || data.description || '',
        level: data.level || 'beginner'
      })
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

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm({
      course_name: course?.course_name || course?.title || '',
      course_description: course?.course_description || course?.description || '',
      level: course?.level || 'beginner'
    })
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      await updateCourse(id, {
        course_name: editForm.course_name,
        course_description: editForm.course_description,
        level: editForm.level
      })
      showToast('Course updated successfully!', 'success')
      setIsEditing(false)
      await loadCourse() // Reload to get updated data
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to update course'
      showToast(message, 'error')
    } finally {
      setSaving(false)
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
    if (!course) {
      return null
    }

    // For trainer: Use course-level enrichment (save to course, not per lesson)
    // This ensures assets are available to all learners and persist
    const courseId = course.id || course.course_id || id
    console.log('[TrainerCourseValidation] Enrichment descriptor:', {
      courseId,
      courseIdFromParams: id,
      courseHasId: !!course.id,
      courseHasCourseId: !!course.course_id
    })
    return {
      type: 'course',
      title: course.title || course.course_name,
      description: course.description || course.course_description,
      metadata: {
        course_id: courseId,
        course_title: course.title || course.course_name,
        skills: course?.skills || [],
        tags: []
      }
    }
  }, [course, id])

  // Enrichment is now on-demand only (triggered by EnrichmentButton)
  // Removed automatic useEffect that was calling fetchEnrichmentAssets

  const handleManualEnrichment = useCallback(
    (response) => {
      setAssetData(response)
      setAssetError(null)
      if (response) {
        // Check if assets were saved to course
        if (response._savedToCourse) {
          showToast('AI enrichment saved to course successfully.', 'success')
          // Reload course to get updated ai_assets
          loadCourse()
        } else if (response._saveError) {
          console.error('Failed to save assets to course:', response._saveError)
          showToast(`AI enrichment generated but failed to save: ${response._saveError}`, 'error')
        } else {
          // No course_id was provided, just show success for generation
          showToast('AI enrichment generated successfully.', 'success')
        }
      }
    },
    [showToast, loadCourse]
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
              <div className="flex-1 space-y-3">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                        Course Name
                      </label>
                      <Input
                        type="text"
                        value={editForm.course_name}
                        onChange={(e) => setEditForm({ ...editForm, course_name: e.target.value })}
                        placeholder="Enter course name"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                        Description
                      </label>
                      <textarea
                        value={editForm.course_description}
                        onChange={(e) => setEditForm({ ...editForm, course_description: e.target.value })}
                        placeholder="Enter course description"
                        rows={4}
                        className="w-full rounded-2xl border border-[rgba(148,163,184,0.35)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm focus:border-[var(--primary-cyan)] focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,233,0.25)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                        Level
                      </label>
                      <select
                        value={editForm.level}
                        onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                        className="w-full rounded-2xl border border-[rgba(148,163,184,0.35)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm focus:border-[var(--primary-cyan)] focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,233,0.25)]"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="primary" onClick={handleSaveEdit} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button variant="secondary" onClick={handleCancelEdit} disabled={saving}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                          {course.title || course.course_name}
                        </h2>
                        <p className="max-w-3xl mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {course.description ||
                            course.course_description ||
                            'Maintain an up-to-date description so learners know exactly what outcomes to expect.'}
                        </p>
                      </div>
                      <Button variant="secondary" onClick={handleStartEdit} className="shrink-0">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(99,102,241,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#4338ca]">
                        {course.level || 'Beginner'}
                      </span>
                    </div>
                  </>
                )}
              </div>
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
                  Course AI Assets
                </h2>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  Generate and manage AI enrichment assets for this course. Assets are saved to the course and will be available to all learners.
                </p>
              </div>
              <EnrichmentButton
                asset={enrichmentAssetDescriptor}
                onResults={handleManualEnrichment}
                onLoading={handleEnrichmentLoading}
                onError={handleEnrichmentError}
                disabled={!enrichmentAssetDescriptor}
                buttonLabel={course?.ai_assets && Object.keys(course.ai_assets).length > 0 ? "Regenerate assets" : "Generate AI assets"}
                className="self-start"
              />
            </header>

            {/* Show existing course assets if available */}
            {course?.ai_assets && Object.keys(course.ai_assets).length > 0 && !assetData && (
              <div className="rounded-2xl border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.1)] p-4 text-sm text-[#047857]">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                Course has AI assets saved. Click "Regenerate assets" to update them.
              </div>
            )}

            <LessonAssetsPanel
              assets={assetData || (course?.ai_assets && Object.keys(course.ai_assets).length > 0 ? course.ai_assets : null)}
              loading={assetLoading}
              error={assetError}
            />
          </section>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" onClick={() => navigate(`/trainer/publish/${id}`)}>
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

