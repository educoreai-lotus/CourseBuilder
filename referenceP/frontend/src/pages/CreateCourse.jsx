import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useCourseStore from '../store/useCourseStore'
import useUserStore from '../store/useUserStore'
import { useToast } from '../contexts/ToastContext'

function CreateCourse() {
  const navigate = useNavigate()
  const { wizardStep, wizardData, updateWizardData, setWizardStep, createCourse, publishCourse, isLoading, resetWizard } = useCourseStore()
  const { userRole } = useUserStore()
  const { showSuccess, showError, showInfo } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSkills, setGeneratedSkills] = useState([])
  const [generatedStructure, setGeneratedStructure] = useState(null)
  const [generatedContent, setGeneratedContent] = useState([])

  const steps = [
    { id: 1, title: 'Course Description', description: 'Enter basic course information' },
    { id: 2, title: 'Skills Expansion', description: 'Review expanded micro-skills' },
    { id: 3, title: 'Course Structure', description: 'Build topics, modules, and lessons' },
    { id: 4, title: 'Content Generation', description: 'Generate lessons from Content Studio' },
    { id: 5, title: 'Publish Course', description: 'Review and publish your course' }
  ]

  const handleNext = async () => {
    if (currentStep < steps.length) {
      // Trigger AI generation when moving to step 2
      if (currentStep === 1 && wizardData.title && wizardData.description) {
        setIsGenerating(true)
        try {
          // Simulate Skills Engine API call
          await new Promise(resolve => setTimeout(resolve, 2000))
          setGeneratedSkills([
            'React Component Creation',
            'Props Management', 
            'Event Handling',
            'State Management',
            'useState Hook',
            'useEffect Hook',
            'Context API',
            'Custom Hooks'
          ])
        } catch (error) {
          console.error('Error generating skills:', error)
          showError('Failed to generate skills. Please try again.')
        } finally {
          setIsGenerating(false)
        }
      }
      
      // Trigger structure generation when moving to step 3
      if (currentStep === 2) {
        setIsGenerating(true)
        try {
          await new Promise(resolve => setTimeout(resolve, 1500))
          setGeneratedStructure({
            topics: [
              {
                id: 'topic_001',
                title: 'React Fundamentals',
                modules: [
                  { id: 'module_001', title: 'Introduction to React', lessons: ['What is React?', 'Setting up React'] },
                  { id: 'module_002', title: 'Components and Props', lessons: ['Functional Components', 'Props and State'] }
                ]
              },
              {
                id: 'topic_002', 
                title: 'Advanced React',
                modules: [
                  { id: 'module_003', title: 'State and Lifecycle', lessons: ['useState Hook', 'useEffect Hook'] },
                  { id: 'module_004', title: 'Hooks and Modern React', lessons: ['Custom Hooks', 'Context API'] }
                ]
              }
            ]
          })
        } catch (error) {
          console.error('Error generating structure:', error)
          showError('Failed to generate course structure. Please try again.')
        } finally {
          setIsGenerating(false)
        }
      }
      
      // Trigger content generation when moving to step 4
      if (currentStep === 3) {
        setIsGenerating(true)
        try {
          await new Promise(resolve => setTimeout(resolve, 3000))
          setGeneratedContent([
            {
              id: 'lesson_001',
              title: 'Introduction to React Components',
              content: 'Learn the fundamentals of React components and how to create your first component.',
              duration: '30 minutes',
              exercises: ['Create a Simple Component', 'Props Practice']
            },
            {
              id: 'lesson_002', 
              title: 'Setting up React Development Environment',
              content: 'Learn how to set up a React development environment using Create React App.',
              duration: '45 minutes',
              exercises: ['Environment Setup', 'First React App']
            }
          ])
        } catch (error) {
          console.error('Error generating content:', error)
          showError('Failed to generate lesson content. Please try again.')
        } finally {
          setIsGenerating(false)
        }
      }
      
      setCurrentStep(currentStep + 1)
      setWizardStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setWizardStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      showInfo('Creating your course...')
      
      const courseData = {
        title: wizardData.title,
        description: wizardData.description,
        skills: generatedSkills,
        metadata: wizardData.metadata,
        structure: generatedStructure
      }
      
      const newCourse = await createCourse(courseData)
      if (newCourse) {
        showSuccess('Course created successfully! Publishing to marketplace...')
        await publishCourse(newCourse.id)
        showSuccess('Course published successfully! Redirecting to dashboard...')
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      } else {
        showError('Failed to create course. Please try again.')
      }
    } catch (error) {
      console.error('Error creating course:', error)
      showError('Failed to create course. Please try again.')
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-primary)', 
                fontSize: '0.9rem', 
                fontWeight: '600', 
                marginBottom: 'var(--spacing-xs)' 
              }}>
                Course Title *
              </label>
              <input
                type="text"
                value={wizardData.title}
                onChange={(e) => updateWizardData({ title: e.target.value })}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
                placeholder="Enter course title"
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-primary)', 
                fontSize: '0.9rem', 
                fontWeight: '600', 
                marginBottom: 'var(--spacing-xs)' 
              }}>
                Course Description *
              </label>
              <textarea
                value={wizardData.description}
                onChange={(e) => updateWizardData({ description: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
                placeholder="Describe what students will learn in this course..."
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  marginBottom: 'var(--spacing-xs)' 
                }}>
                  Difficulty Level
                </label>
                <select
                  value={wizardData.metadata.difficulty}
                  onChange={(e) => updateWizardData({ 
                    metadata: { ...wizardData.metadata, difficulty: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  marginBottom: 'var(--spacing-xs)' 
                }}>
                  Duration
                </label>
                <select
                  value={wizardData.metadata.duration}
                  onChange={(e) => updateWizardData({ 
                    metadata: { ...wizardData.metadata, duration: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="2 weeks">2 weeks</option>
                  <option value="4 weeks">4 weeks</option>
                  <option value="6 weeks">6 weeks</option>
                  <option value="8 weeks">8 weeks</option>
                  <option value="12 weeks">12 weeks</option>
                </select>
              </div>
            </div>
          </div>
        )
      
      case 2:
        return (
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
                Expanded Skills from Skills Engine
              </h3>
              <div style={{
                background: 'rgba(8, 145, 178, 0.1)',
                border: '1px solid rgba(8, 145, 178, 0.2)',
                borderRadius: '8px',
                padding: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Based on your course description, the Skills Engine has identified the following micro-skills:
                </p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
              {generatedSkills.map((skill, index) => (
                <div key={index} style={{
                  background: 'var(--gradient-card)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: 'var(--spacing-md)',
                  transition: 'all 0.3s ease'
                }}>
                  <h4 style={{ 
                    color: 'var(--text-primary)', 
                    fontSize: '0.9rem', 
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-sm)'
                  }}>
                    {skill}
                  </h4>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--spacing-xs)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem'
                  }}>
                    <span style={{ color: 'var(--accent-green)' }}>✓</span>
                    <span>AI Generated</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 3:
        return (
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
                AI-Generated Course Structure
              </h3>
              <div style={{
                background: 'rgba(6, 95, 70, 0.1)',
                border: '1px solid rgba(6, 95, 70, 0.2)',
                borderRadius: '8px',
                padding: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  AI has created an optimal course structure based on your skills and description:
                </p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
              {generatedStructure?.topics?.map((topic, topicIndex) => (
                <div key={topic.id} style={{
                  background: 'var(--gradient-card)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: 'var(--spacing-md)'
                }}>
                  <h4 style={{ 
                    color: 'var(--text-primary)', 
                    fontSize: '1rem', 
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-sm)'
                  }}>
                    Topic {topicIndex + 1}: {topic.title}
                  </h4>
                  <div style={{ marginLeft: 'var(--spacing-md)' }}>
                    {topic.modules.map((module, moduleIndex) => (
                      <div key={module.id} style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        marginBottom: 'var(--spacing-xs)',
                        padding: 'var(--spacing-xs)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px'
                      }}>
                        Module {moduleIndex + 1}: {module.title}
                        {module.lessons && (
                          <div style={{ marginLeft: 'var(--spacing-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {module.lessons.map((lesson, lessonIndex) => (
                              <div key={lessonIndex}>• {lesson}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 4:
        return (
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
                Generated Content from Content Studio
              </h3>
              <div style={{
                background: 'rgba(4, 120, 87, 0.1)',
                border: '1px solid rgba(4, 120, 87, 0.2)',
                borderRadius: '8px',
                padding: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Content Studio has generated lessons and exercises for your course:
                </p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
              {generatedContent.map((lesson, index) => (
                <div key={lesson.id} style={{
                  background: 'var(--gradient-card)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: 'var(--spacing-md)'
                }}>
                  <h4 style={{ 
                    color: 'var(--text-primary)', 
                    fontSize: '1rem', 
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-sm)'
                  }}>
                    Lesson {index + 1}: {lesson.title}
                  </h4>
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.9rem',
                    marginBottom: 'var(--spacing-sm)'
                  }}>
                    {lesson.content}
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--spacing-sm)',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem'
                  }}>
                    <span>⏱️ {lesson.duration}</span>
                    <span>•</span>
                    <span>📚 {lesson.exercises?.length || 0} exercises</span>
                  </div>
                  {lesson.exercises && (
                    <div style={{ marginTop: 'var(--spacing-sm)' }}>
                      <div style={{ 
                        color: 'var(--text-secondary)', 
                        fontSize: '0.8rem', 
                        fontWeight: '600',
                        marginBottom: 'var(--spacing-xs)'
                      }}>
                        Exercises:
                      </div>
                      {lesson.exercises.map((exercise, exerciseIndex) => (
                        <div key={exerciseIndex} style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.8rem',
                          marginLeft: 'var(--spacing-sm)',
                          marginBottom: 'var(--spacing-xs)'
                        }}>
                          • {exercise}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      
      case 5:
        return (
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
                Review and Publish Course
              </h3>
            </div>
            
            <div style={{
              background: 'var(--gradient-card)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: 'var(--spacing-lg)'
            }}>
              <h4 style={{ 
                color: 'var(--text-primary)', 
                fontSize: '1rem', 
                fontWeight: '600',
                marginBottom: 'var(--spacing-md)'
              }}>
                Course Summary
              </h4>
              <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Title:</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '500' }}>{wizardData.title}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Description:</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>{wizardData.description}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Difficulty:</span>
                  <span style={{ 
                    color: 'white', 
                    fontSize: '0.8rem', 
                    fontWeight: '500',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: wizardData.metadata.difficulty === 'beginner' ? 'var(--accent-green)' : 
                               wizardData.metadata.difficulty === 'intermediate' ? 'var(--accent-gold)' : 'var(--accent-orange)'
                  }}>
                    {wizardData.metadata.difficulty}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Duration:</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '500' }}>{wizardData.metadata.duration}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Skills:</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '500' }}>{generatedSkills.length} skills</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Lessons:</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '500' }}>{generatedContent.length} lessons</span>
                </div>
              </div>
            </div>
            
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '8px',
              padding: 'var(--spacing-md)'
            }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Ready to publish your course? This will make it available to learners immediately.
              </p>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  // Redirect if not trainer
  if (userRole !== 'trainer') {
    return (
      <div className="personalized-dashboard">
        <div className="dashboard-container">
          <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <div className="dashboard-icon" style={{ margin: '0 auto var(--spacing-lg)' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
              Access Denied
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Only trainers can create courses. Please switch to trainer mode to access this feature.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="personalized-dashboard">
      <div className="dashboard-container">
        <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <h1 className="section-title" style={{ textAlign: 'left', marginBottom: 'var(--spacing-md)' }}>Create New Course</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Use AI to generate and structure your course content</p>
        </div>
        
        {/* Progress Steps */}
        <div className="dashboard-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ 
            padding: 'var(--spacing-lg)', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
              Course Creation Progress
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              {steps.map((step, index) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: '1', minWidth: '120px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    background: currentStep >= step.id ? 'var(--primary-cyan)' : 'var(--bg-tertiary)',
                    color: currentStep >= step.id ? 'white' : 'var(--text-muted)',
                    marginRight: 'var(--spacing-sm)'
                  }}>
                    {step.id}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      color: currentStep >= step.id ? 'var(--text-primary)' : 'var(--text-muted)', 
                      fontSize: '0.9rem', 
                      fontWeight: '500' 
                    }}>
                      {step.title}
                    </div>
                    <div style={{ 
                      color: 'var(--text-secondary)', 
                      fontSize: '0.8rem' 
                    }}>
                      {step.description}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div style={{
                      width: '20px',
                      height: '2px',
                      background: currentStep > step.id ? 'var(--primary-cyan)' : 'var(--bg-tertiary)',
                      margin: '0 var(--spacing-sm)'
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="dashboard-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ 
            padding: 'var(--spacing-lg)', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600', marginBottom: 'var(--spacing-sm)' }}>
              {steps[currentStep - 1].title}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>{steps[currentStep - 1].description}</p>
          </div>
          
          <div style={{ padding: 'var(--spacing-lg)' }}>
            {isGenerating ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                <div className="loading-spinner" style={{ margin: '0 auto var(--spacing-lg)' }}></div>
                <h3 style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: 'var(--spacing-sm)' }}>
                  AI is working...
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {currentStep === 1 ? 'Analyzing your course description and generating skills...' :
                   currentStep === 2 ? 'Creating optimal course structure...' :
                   'Generating lesson content and exercises...'}
                </p>
              </div>
            ) : (
              renderStep()
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="dashboard-card">
          <div style={{ 
            padding: 'var(--spacing-lg)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: 'var(--spacing-md)'
          }}>
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="btn btn-secondary"
              style={{
                opacity: currentStep === 1 ? 0.5 : 1,
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Step {currentStep} of {steps.length}
              </span>
            </div>
            
            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                disabled={isGenerating || (currentStep === 1 && (!wizardData.title || !wizardData.description))}
                className="btn btn-primary"
                style={{
                  opacity: (isGenerating || (currentStep === 1 && (!wizardData.title || !wizardData.description))) ? 0.5 : 1,
                  cursor: (isGenerating || (currentStep === 1 && (!wizardData.title || !wizardData.description))) ? 'not-allowed' : 'pointer'
                }}
              >
                {isGenerating ? 'Generating...' : 'Next →'}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn btn-primary"
                style={{
                  background: 'var(--accent-green)',
                  opacity: isLoading ? 0.5 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? 'Creating Course...' : '✓ Create & Publish Course'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateCourse
