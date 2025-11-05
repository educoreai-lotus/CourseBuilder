import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function AccessibilityControls() {
  const { accessibility, updateAccessibility } = useApp()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="accessibility-toggle"
        aria-label="Accessibility options"
        aria-expanded={isOpen}
      >
        <i className="fas fa-universal-access"></i>
      </button>

      {isOpen && (
        <div className="accessibility-controls visible">
          <button
            onClick={() => updateAccessibility('colorblind', !accessibility.colorblind)}
            className={accessibility.colorblind ? 'active' : ''}
            aria-label="Colorblind friendly mode"
            title="Colorblind Friendly"
          >
            <i className="fas fa-palette"></i>
          </button>
          <button
            onClick={() => updateAccessibility('highContrast', !accessibility.highContrast)}
            className={accessibility.highContrast ? 'active' : ''}
            aria-label="High contrast mode"
            title="High Contrast"
          >
            <i className="fas fa-adjust"></i>
          </button>
          <button
            onClick={() => updateAccessibility('largeFont', !accessibility.largeFont)}
            className={accessibility.largeFont ? 'active' : ''}
            aria-label="Large font mode"
            title="Large Font"
          >
            <i className="fas fa-text-height"></i>
          </button>
        </div>
      )}
    </>
  )
}

