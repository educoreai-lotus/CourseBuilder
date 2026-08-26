import LoadingSpinner from './LoadingSpinner.jsx'
import {
  FAILED_GENERATION_MESSAGE,
  GENERATING_MESSAGE
} from '../utils/personalizedGenerationJobs.js'

/**
 * Compact generating / failed state for personalized course generation.
 */
export default function PersonalizedGenerationState({
  mode = 'generating',
  competencyName = null,
  className = ''
}) {
  const title =
    competencyName && String(competencyName).trim()
      ? String(competencyName).trim()
      : 'Personalized course'

  if (mode === 'failed') {
    return (
      <div
        className={`surface-card soft space-y-3 p-6 ${className}`.trim()}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <i
            className="fa-solid fa-triangle-exclamation text-xl"
            style={{ color: 'var(--accent-orange)' }}
            aria-hidden="true"
          />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{FAILED_GENERATION_MESSAGE}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`surface-card soft space-y-2 p-4 ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <h3 className="text-lg font-semibold text-center text-[var(--text-primary)]">{title}</h3>
      <LoadingSpinner message={GENERATING_MESSAGE} />
    </div>
  )
}
