import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function CourseCard({ course, showProgress = false, progress = 0 }) {
  const { theme } = useApp()
  
  const courseId = course.id || course.course_id
  const title = course.title || course.course_name
  const description = course.description || course.course_description
  const level = course.level || 'beginner'
  const rating = course.rating || course.average_rating || 0
  const status = course.status || 'live'

  return (
    <Link
      to={`/courses/${courseId}`}
      className="microservice-card"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div className="service-icon" style={{
        background: status === 'live' 
          ? 'var(--gradient-brand)' 
          : 'var(--bg-tertiary)'
      }}>
        <i className={status === 'live' ? 'fas fa-graduation-cap' : 'fas fa-edit'}></i>
      </div>
      
      <h3 style={{
        fontSize: '1.2rem',
        fontWeight: 600,
        marginBottom: 'var(--spacing-sm)',
        color: 'var(--text-primary)'
      }}>
        {title}
      </h3>
      
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        marginBottom: 'var(--spacing-md)',
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {description || 'No description available.'}
      </p>

      {/* Progress Bar */}
      {showProgress && progress > 0 && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-xs)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${progress}%`,
                background: 'var(--gradient-secondary)'
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Tags and Rating */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
          <span style={{
            padding: 'var(--spacing-xs) var(--spacing-sm)',
            background: 'rgba(0, 166, 118, 0.1)',
            color: 'var(--primary-emerald)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 500,
            textTransform: 'capitalize'
          }}>
            {level}
          </span>
          {status !== 'live' && (
            <span style={{
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              background: 'rgba(100, 116, 139, 0.1)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              textTransform: 'capitalize'
            }}>
              {status}
            </span>
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          color: '#FACC15'
        }}>
          <i className="fas fa-star"></i>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {rating.toFixed(1)}
          </span>
        </div>
      </div>

      {course.duration && (
        <div style={{
          marginTop: 'var(--spacing-sm)',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)'
        }}>
          <i className="fas fa-clock"></i>
          <span>{course.duration} minutes</span>
        </div>
      )}
    </Link>
  )
}

