import { Link } from 'react-router-dom'
import { Star, Clock, Users, Play, Award, BookOpen } from 'lucide-react'
import useUserStore from '../store/useUserStore'

function CourseCard({ 
  course,
  showEnrollButton = true,
  isPersonalized = false
}) {
  if (!course) return null

  const { isEnrolled, getCourseProgress } = useUserStore()
  const isEnrolledInCourse = isEnrolled(course.id)
  const progress = getCourseProgress(course.id)
  const hasStartedLearning = progress.progressPercentage > 0 || (progress.completedLessons && progress.completedLessons.length > 0)
  
  // Debug logging
  console.log('CourseCard - Course ID:', course.id)
  console.log('CourseCard - Progress:', progress)
  console.log('CourseCard - Is Enrolled:', isEnrolledInCourse)
  console.log('CourseCard - Has Started Learning:', hasStartedLearning)

  const {
    id,
    title,
    description,
    instructor,
    metadata = {},
    rating = 0,
    price = 0,
    courseType = 'general',
    skills = []
  } = course

  const difficulty = metadata.difficulty || 'intermediate'
  const duration = metadata.duration || '4 weeks'
  const courseRating = rating || 0
  const coursePrice = price || 0
  const isFree = coursePrice === 0

  const difficultyColors = {
    'beginner': 'badge-green',
    'intermediate': 'badge-gold',
    'advanced': 'badge-red',
    'adaptive': 'badge-purple'
  }

  const courseTypeConfig = {
    'general': { label: 'Marketplace', color: 'badge-blue', icon: BookOpen },
    'personalized': { label: 'Personalized', color: 'badge-purple', icon: Award }
  }

  const typeConfig = courseTypeConfig[courseType] || courseTypeConfig['general']
  const TypeIcon = typeConfig.icon

  return (
    <div className="microservice-card h-full flex flex-col" style={{ minHeight: '400px' }}>
      {/* Course Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 mr-4">
          <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)', lineHeight: '1.3' }}>
            {title}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className={`badge ${typeConfig.color} flex items-center gap-1`}>
            <TypeIcon size={12} />
            {typeConfig.label}
          </span>
          <span className={`badge ${difficultyColors[difficulty]}`}>
            {difficulty}
          </span>
        </div>
      </div>

      {/* Course Stats */}
      <div className="flex items-center gap-6 mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-1">
          <Star size={16} style={{ color: 'var(--accent-gold)' }} />
          <span className="font-medium">{courseRating}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={16} />
          <span>{duration}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users size={16} />
          <span>{course.students || 0} students</span>
        </div>
      </div>

      {/* Instructor */}
      <div className="mb-6">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-medium">Instructor:</span> {instructor || 'Unknown Instructor'}
        </p>
      </div>

      {/* Skills */}
      {skills && skills.length > 0 && (
        <div className="mb-6 flex-1">
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 3).map((skill, index) => (
              <span key={index} className="badge badge-blue text-xs px-2 py-1">
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="badge badge-blue text-xs px-2 py-1">
                +{skills.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Price and Action */}
      <div className="flex justify-between items-center mt-auto pt-4">
        <div className="flex items-center gap-2">
          {isFree ? (
            <span className="text-xl font-bold" style={{ color: 'var(--accent-green)' }}>Free</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>${coursePrice}</span>
              {coursePrice > 0 && (
                <span className="text-sm line-through" style={{ color: 'var(--text-muted)' }}>
                  ${Math.round(coursePrice * 1.2)}
                </span>
              )}
            </div>
          )}
        </div>
        
        {showEnrollButton && (
          <Link
            to={`/course/${id}`}
            className="btn btn-primary flex items-center gap-2 px-4 py-2"
          >
            <Play size={16} />
            {courseType === 'personalized' 
              ? (hasStartedLearning ? 'Continue Learning' : 'Start Learning')
              : (isEnrolledInCourse 
                  ? (hasStartedLearning ? 'Continue Learning' : 'Start Learning')
                  : 'Enroll Now')
            }
          </Link>
        )}
      </div>
    </div>
  )
}

export default CourseCard