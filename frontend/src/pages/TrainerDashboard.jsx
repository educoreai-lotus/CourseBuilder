import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCourses, createCourse, publishCourse } from '../services/apiService.js'
import Button from '../components/Button.jsx'
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
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState([])
  const [createdCourseId, setCreatedCourseId] = useState('')
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
    setLoading(true)
    try {
      const payload = {
        course_name: form.name,
        course_description: form.description,
        level: form.level,
        trainer_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        trainer_name: 'Trainer',
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean)
      }
      const res = await createCourse(payload)
      setCreatedCourseId(res.course_id)
      showToast('Draft course created successfully!', 'success')
      setForm({ name: '', description: '', level: 'beginner', skills: '' })
      setShowCreateForm(false)
      loadCourses()
    } catch (err) {
      showToast('Failed to create course', 'error')
    } finally {
      setLoading(false)
    }
  }

  const onPublish = async (courseId) => {
    setLoading(true)
    try {
      await publishCourse(courseId)
      showToast('Course published successfully!', 'success')
      loadCourses()
    } catch {
      showToast('Publish failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
      <div className="microservices-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <h1 className="section-title" style={{ marginBottom: 0 }}>
            Trainer Dashboard
          </h1>
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <i className="fas fa-plus mr-2"></i>
            {showCreateForm ? 'Cancel' : 'Create Course'}
          </Button>
        </div>

        {/* Create Course Form */}
        {showCreateForm && (
          <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: 'var(--spacing-lg)',
              color: 'var(--text-primary)'
            }}>
              Create New Course
            </h2>
            <form onSubmit={submit}>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-xs)',
                  color: 'var(--text-secondary)',
                  fontWeight: 500
                }}>
                  Course Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter course name"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-xs)',
                  color: 'var(--text-secondary)',
                  fontWeight: 500
                }}>
                  Description *
                </label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Enter course description"
                  rows="4"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-md)'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-xs)',
                    color: 'var(--text-secondary)',
                    fontWeight: 500
                  }}>
                    Level
                  </label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-xs)',
                    color: 'var(--text-secondary)',
                    fontWeight: 500
                  }}>
                    Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.skills}
                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="e.g., JavaScript, React, Node.js"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Create Draft
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Courses List */}
        <div style={{ marginTop: 'var(--spacing-xl)' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-primary)'
          }}>
            My Courses ({courses.length})
          </h2>

          {loading && courses.length === 0 ? (
            <LoadingSpinner />
          ) : courses.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 'var(--spacing-2xl)',
              color: 'var(--text-muted)'
            }}>
              <i className="fas fa-book-open" style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}></i>
              <p>No courses yet. Create your first course!</p>
            </div>
          ) : (
            <div className="microservices-grid">
              {courses.map(course => (
                <div key={course.id || course.course_id} className="microservice-card">
                  <div className="service-icon" style={{
                    background: course.status === 'live' 
                      ? 'var(--gradient-primary)' 
                      : 'var(--bg-tertiary)'
                  }}>
                    <i className={course.status === 'live' ? 'fas fa-check' : 'fas fa-edit'}></i>
                  </div>
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    marginBottom: 'var(--spacing-sm)',
                    color: 'var(--text-primary)'
                  }}>
                    {course.title || course.course_name}
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    {course.description || course.course_description || 'No description'}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    <span style={{
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      background: course.status === 'live' 
                        ? 'rgba(4, 120, 87, 0.1)' 
                        : 'rgba(100, 116, 139, 0.1)',
                      color: course.status === 'live' 
                        ? 'var(--accent-green)' 
                        : 'var(--text-muted)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      textTransform: 'capitalize'
                    }}>
                      {course.status || 'draft'}
                    </span>
                    <span style={{
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      background: 'rgba(0, 166, 118, 0.1)',
                      color: 'var(--primary-emerald)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      textTransform: 'capitalize'
                    }}>
                      {course.level || 'beginner'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    {course.status !== 'live' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onPublish(course.id || course.course_id)}
                        disabled={loading}
                        style={{ flex: 1 }}
                      >
                        <i className="fas fa-paper-plane mr-2"></i>
                        Publish
                      </Button>
                    )}
                    <Link
                      to={`/trainer/course/${course.id || course.course_id}`}
                      style={{ flex: 1, textDecoration: 'none' }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        style={{ width: '100%' }}
                      >
                        <i className="fas fa-edit mr-2"></i>
                        Validate
                      </Button>
                    </Link>
                    {course.status === 'live' && (
                      <Link
                        to={`/trainer/feedback/${course.id || course.course_id}`}
                        style={{ flex: 1, textDecoration: 'none' }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          style={{ width: '100%' }}
                        >
                          <i className="fas fa-chart-line mr-2"></i>
                          Analytics
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Toast />
    </div>
  )
}
