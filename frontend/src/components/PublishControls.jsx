import { useState } from 'react'
import Button from './Button.jsx'

export default function PublishControls({ courseId, onPublish, onSchedule, loading = false }) {
  const [publishMode, setPublishMode] = useState('immediate') // 'immediate' or 'scheduled'
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const handlePublish = () => {
    if (publishMode === 'immediate') {
      onPublish()
    } else {
      if (!scheduledDate || !scheduledTime) {
        alert('Please select both date and time for scheduled publishing')
        return
      }
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      onSchedule({ scheduled_at: scheduledAt })
    }
  }

  return (
    <div className="card">
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: 'var(--spacing-lg)',
        color: 'var(--text-primary)'
      }}>
        Publish Course
      </h3>

      {/* Publish Mode Selection */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <label style={{
          display: 'block',
          marginBottom: 'var(--spacing-sm)',
          color: 'var(--text-primary)',
          fontWeight: 500
        }}>
          Publish Mode
        </label>
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => setPublishMode('immediate')}
            style={{
              flex: 1,
              padding: 'var(--spacing-md)',
              background: publishMode === 'immediate' 
                ? 'var(--gradient-primary)' 
                : 'var(--bg-secondary)',
              color: publishMode === 'immediate' ? 'white' : 'var(--text-primary)',
              border: `2px solid ${publishMode === 'immediate' ? 'transparent' : 'var(--bg-tertiary)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500,
              minWidth: '150px'
            }}
          >
            <i className="fas fa-bolt mr-2"></i>
            Immediate
          </button>
          <button
            type="button"
            onClick={() => setPublishMode('scheduled')}
            style={{
              flex: 1,
              padding: 'var(--spacing-md)',
              background: publishMode === 'scheduled' 
                ? 'var(--gradient-primary)' 
                : 'var(--bg-secondary)',
              color: publishMode === 'scheduled' ? 'white' : 'var(--text-primary)',
              border: `2px solid ${publishMode === 'scheduled' ? 'transparent' : 'var(--bg-tertiary)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500,
              minWidth: '150px'
            }}
          >
            <i className="fas fa-calendar-alt mr-2"></i>
            Scheduled
          </button>
        </div>
      </div>

      {/* Scheduled Date/Time Inputs */}
      {publishMode === 'scheduled' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-lg)',
          padding: 'var(--spacing-md)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: 'var(--spacing-xs)',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              marginBottom: 'var(--spacing-xs)',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              Time
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Info Message */}
      <div style={{
        padding: 'var(--spacing-md)',
        background: 'rgba(0, 166, 118, 0.1)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--spacing-lg)',
        color: 'var(--text-primary)',
        fontSize: '0.9rem'
      }}>
        <i className="fas fa-info-circle mr-2" style={{ color: 'var(--primary-emerald)' }}></i>
        {publishMode === 'immediate' 
          ? 'The course will be published immediately and visible in the marketplace.'
          : 'The course will be published at the scheduled date and time.'}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
        <Button
          variant="primary"
          onClick={handlePublish}
          disabled={loading}
          style={{ flex: 1 }}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Publishing...
            </>
          ) : (
            <>
              <i className="fas fa-paper-plane mr-2"></i>
              {publishMode === 'immediate' ? 'Publish Now' : 'Schedule Publish'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

