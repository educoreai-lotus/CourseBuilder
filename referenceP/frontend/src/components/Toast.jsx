import React, { useState, useEffect } from 'react'

function Toast({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose,
  position = 'top-right'
}) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 300)
  }

  const typeStyles = {
    success: {
      background: 'var(--accent-green)',
      borderColor: 'rgba(4, 120, 87, 0.3)',
      icon: '✓'
    },
    error: {
      background: 'var(--accent-orange)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      icon: '⚠'
    },
    warning: {
      background: 'var(--accent-gold)',
      borderColor: 'rgba(217, 119, 6, 0.3)',
      icon: '⚠'
    },
    info: {
      background: 'var(--primary-cyan)',
      borderColor: 'rgba(8, 145, 178, 0.3)',
      icon: 'ℹ'
    }
  }

  const currentType = typeStyles[type] || typeStyles.info

  if (!isVisible) return null

  return (
    <div 
      className={`toast toast-${position}`}
      style={{
        position: 'fixed',
        top: position.includes('top') ? '20px' : 'auto',
        bottom: position.includes('bottom') ? '20px' : 'auto',
        right: position.includes('right') ? '20px' : 'auto',
        left: position.includes('left') ? '20px' : 'auto',
        zIndex: 10000,
        background: currentType.background,
        color: 'white',
        padding: 'var(--spacing-md) var(--spacing-lg)',
        borderRadius: '8px',
        border: `1px solid ${currentType.borderColor}`,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        maxWidth: '400px',
        minWidth: '300px',
        transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
        opacity: isExiting ? 0 : 1,
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onClick={handleClose}
    >
      <span style={{ fontSize: '1.2rem' }}>{currentType.icon}</span>
      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '500' }}>{message}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '1.2rem',
          cursor: 'pointer',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px'
        }}
      >
        ×
      </button>
    </div>
  )
}

export default Toast


