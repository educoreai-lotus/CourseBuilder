import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourses, triggerPersonalizedCourse } from '../services/apiService.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApp } from '../context/AppContext.jsx'
import Container from '../components/Container.jsx'
import CourseCard from '../components/CourseCard.jsx'

const LEARNING_TEMPLATES = [
  {
    id: 'frontend-ai',
    title: 'AI-Enhanced Frontend Accelerator',
    description: 'React fundamentals, design systems, and AI-powered interface patterns.',
    level: 'intermediate',
    duration: 360,
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'AI UI Patterns'],
    learningPath: [
      {
        topic_name: 'React Foundations',
        topic_description: 'Component driven architecture and JSX fundamentals.'
      },
      {
        topic_name: 'State & Data Flows',
        topic_description: 'Hooks, context, and data fetching patterns for resilient UIs.'
      },
      {
        topic_name: 'Design Systems & AI UI',
        topic_description: 'Build adaptive design systems with Tailwind and AI assisted tooling.'
      }
    ]
  },
  {
    id: 'backend-services',
    title: 'Cloud-Native Backend Services',
    description: 'Modern Node.js APIs, database tuning, and DevOps automation.',
    level: 'intermediate',
    duration: 420,
    skills: ['Node.js', 'Express', 'PostgreSQL', 'Docker', 'GitHub Actions'],
    learningPath: [
      {
        topic_name: 'Service Architecture Essentials',
        topic_description: 'Designing resilient REST APIs with layered architecture.'
      },
      {
        topic_name: 'Data Persistence & Optimization',
        topic_description: 'PostgreSQL performance tuning, migrations, and observability.'
      },
      {
        topic_name: 'DevOps Automation',
        topic_description: 'CI/CD pipelines, containerization, and deployment strategies.'
      }
    ]
  },
  {
    id: 'data-ml',
    title: 'Data & Machine Learning Foundations',
    description: 'Analytics workflows, model experimentation, and MLOps readiness.',
    level: 'advanced',
    duration: 480,
    skills: ['Python', 'Pandas', 'Machine Learning', 'MLOps'],
    learningPath: [
      {
        topic_name: 'Analytics Toolkit',
        topic_description: 'Data exploration with pandas, NumPy, and visualization best practices.'
      },
      {
        topic_name: 'Modeling & Evaluation',
        topic_description: 'Supervised learning workflows, feature engineering, and model validation.'
      },
      {
        topic_name: 'Operationalizing ML',
        topic_description: 'Experiment tracking, deployment patterns, and monitoring.'
      }
    ]
  }
]

export default function LearnerForYou() {
  const { showToast, userProfile } = useApp()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState(LEARNING_TEMPLATES[0].id)

  const selectedTemplate = useMemo(
    () => LEARNING_TEMPLATES.find((template) => template.id === selectedTemplateId) || LEARNING_TEMPLATES[0],
    [selectedTemplateId]
  )

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses({ limit: 100 })
      const personalised = (data.courses || [])
        .filter((course) => {
          // Primary check: learner_specific course type (personalized courses)
          if (course.course_type === 'learner_specific') {
            return true
          }
          
          // Fallback: check metadata for backward compatibility
          const meta = course.metadata || {}
          return meta.personalized === true || meta.source === 'learner_ai'
        })
        .sort((a, b) => {
          const first = new Date(b.created_at || b.updated_at || Date.now())
          const second = new Date(a.created_at || a.updated_at || Date.now())
          return first - second
        })
      setCourses(personalised)
    } catch (err) {
      showToast('Failed to load personalized recommendations', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  const handleGenerateCourse = async () => {
    if (!selectedTemplate || generating) return

    setGenerating(true)
    try {
      await triggerPersonalizedCourse({
        learner_id: userProfile?.id || null,
        learner_name: userProfile?.name || null,
        learner_company: userProfile?.company || null,
        level: selectedTemplate.level,
        duration: selectedTemplate.duration,
        skills: selectedTemplate.skills,
        learning_path: selectedTemplate.learningPath,
        metadata: {
          template_id: selectedTemplate.id,
          template_title: selectedTemplate.title
        }
      })

      showToast('AI is generating your personalized course...', 'success')
      await loadCourses()
    } catch (err) {
      showToast('Unable to trigger personalized course', 'error')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="page-surface">
        <Container>
          <div className="surface-card soft flex min-h-[60vh] items-center justify-center">
            <LoadingSpinner message="Loading AI recommendations..." />
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="page-surface">
      <Container>
        <div className="stack-lg">
          <section className="surface-card space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary-cyan)]">
                Personalised journey
              </p>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">Courses curated just for you</h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
                Trigger AI to assemble a tailored learning path. Pick a focus, generate a course, and start learning
                instantly with enriched lessons, labs, and curated resources.
              </p>
            </div>

            <div className="flex flex-col gap-6 rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/95 p-6 shadow-[var(--shadow-card)] md:flex-row md:items-end md:justify-between">
              <div className="space-y-3 md:max-w-xl">
                <div className="space-y-2">
                  <label htmlFor="ai-template" className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Learning focus
                  </label>
                  <select
                    id="ai-template"
                    value={selectedTemplateId}
                    onChange={(event) => setSelectedTemplateId(event.target.value)}
                    className="w-full rounded-2xl border border-[rgba(148,163,184,0.35)] bg-white/90 px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm backdrop-blur focus:border-[var(--primary-cyan)] focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,233,0.25)] dark:bg-[var(--bg-secondary)] dark:text-[var(--text-primary)]"
                  >
                    {LEARNING_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">{selectedTemplate.description}</p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-muted)]">
                  {selectedTemplate.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-[rgba(14,165,233,0.12)] px-3 py-1 text-xs font-semibold text-[#0f766e]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 md:w-56">
                <button
                  type="button"
                  className="btn btn-primary flex items-center justify-center gap-2"
                  onClick={handleGenerateCourse}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <i className="fa-solid fa-circle-notch animate-spin" aria-hidden="true" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-sparkles" aria-hidden="true" />
                      Generate with AI
                    </>
                  )}
                </button>
                <Link to="/learner/enrolled" className="btn btn-secondary text-center">
                  View my library
                </Link>
              </div>
            </div>
          </section>

          <section className="surface-card space-y-6">
            {courses.length === 0 ? (
              <div className="text-center space-y-4">
                <i className="fa-solid fa-sparkles text-3xl text-[var(--primary-cyan)]" aria-hidden="true" />
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  No personalised courses yet
                </h2>
                <p className="text-[var(--text-secondary)]">
                  Generate your first learning path above to see AI-curated courses appear here.
                </p>
              </div>
            ) : (
              <div className="course-grid">
                {courses.map((course) => {
                  const courseId = course.id || course.course_id
                  return (
                    <CourseCard
                      key={courseId}
                      course={course}
                      to={`/courses/${courseId}?personalized=true`}
                    />
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </Container>
    </div>
  )
}

