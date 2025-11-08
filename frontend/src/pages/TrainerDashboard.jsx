import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCourses, createCourse, publishCourse } from '../services/apiService.js'
import Toast from '../components/Toast.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext'

export default function TrainerDashboard() {
  const { showToast } = useApp()
  const [form, setForm] = useState({
    name: '',
    description: '',
    level: 'beginner',
    skills: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [courses, setCourses] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const data = await getCourses({ limit: 50 })
      setCourses(data.courses || [])
    } catch (err) {
      showToast('Failed to load courses', 'error')
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name || form.name.trim().length < 3) {
      showToast('Course name must be at least 3 characters', 'error')
      return
    }
    if (!form.description || form.description.trim().length < 10) {
      showToast('Course description must be at least 10 characters', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        course_name: form.name.trim(),
        course_description: form.description.trim(),
        level: form.level,
        trainer_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        trainer_name: 'Trainer',
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : []
      }
      await createCourse(payload)
      showToast('Draft course created successfully!', 'success')
      setForm({ name: '', description: '', level: 'beginner', skills: '' })
      setShowCreateForm(false)
      loadCourses()
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create course'
      showToast(errorMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const onPublish = async (courseId) => {
    if (!window.confirm('Publish this course to the marketplace?')) return
    setSubmitting(true)
    try {
      await publishCourse(courseId)
      showToast('Course published successfully!', 'success')
      loadCourses()
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to publish course'
      showToast(errorMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-200">Trainer Mode</p>
            <h1 className="text-3xl font-bold md:text-4xl">Build, validate, and ship courses faster</h1>
            <p className="text-sm text-slate-200 md:text-base">
              Manage drafts, publish content, and monitor learner engagement from a single workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm(prev => !prev)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-white/25"
          >
            <i className={`fa-solid ${showCreateForm ? 'fa-xmark' : 'fa-plus'} text-xs`} />
            {showCreateForm ? 'Close form' : 'Create new course'}
          </button>
        </div>
      </header>

      {showCreateForm && (
        <section className="rounded-3xl bg-white/90 p-8 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-800">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Draft a new course</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Provide essential details; you can refine modules and lessons later.
          </p>
          <form onSubmit={submit} className="mt-6 grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Course name *
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Advanced React Patterns"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Level *
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Description *
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the learning outcomes and target audience."
                rows={4}
                required
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Skills (comma-separated)
              <input
                type="text"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="e.g., JavaScript, React, Testing"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    Saving draft…
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-save" />
                    Save draft
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-3xl bg-white/90 p-8 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/70 dark:ring-slate-800">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
              Active Courses
            </p>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
              My course portfolio ({courses.length})
            </h2>
          </div>
          <Link
            to="/trainer/courses"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            View lifecycle workspace <i className="fa-solid fa-arrow-right text-xs" />
          </Link>
        </header>

        {submitting && courses.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <LoadingSpinner message="Syncing courses..." />
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <i className="fa-solid fa-layer-group text-4xl text-indigo-400" />
            <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">
              No courses yet
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Create your first course and publish it to the marketplace.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {courses.map(course => (
              <div
                key={course.id || course.course_id}
                className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                      {course.level || 'beginner'}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {course.title || course.course_name}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-300">
                      {course.description || course.course_description || 'No description yet.'}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    (course.status || 'draft') === 'live'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : (course.status || 'draft') === 'archived'
                        ? 'bg-slate-400/10 text-slate-500'
                        : 'bg-amber-400/10 text-amber-600'
                  }`}>
                    <i className="fa-solid fa-circle text-[8px]" />
                    {course.status || 'draft'}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {course.status !== 'live' && (
                    <button
                      type="button"
                      onClick={() => onPublish(course.id || course.course_id)}
                      disabled={submitting}
                      className="group inline-flex items-center justify-between rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300"
                    >
                      Publish <i className="fa-solid fa-paper-plane text-slate-400 group-hover:translate-x-1" />
                    </button>
                  )}
                  <Link
                    to={`/trainer/course/${course.id || course.course_id}`}
                    className="group inline-flex items-center justify-between rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300"
                  >
                    Edit & validate <i className="fa-solid fa-pen-to-square text-slate-400 group-hover:translate-x-1" />
                  </Link>
                  {course.status === 'live' && (
                    <Link
                      to={`/trainer/feedback/${course.id || course.course_id}`}
                      className="group inline-flex items-center justify-between rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-300"
                    >
                      Analytics <i className="fa-solid fa-chart-line text-slate-400 group-hover:translate-x-1" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Toast />
    </div>
  )
}
