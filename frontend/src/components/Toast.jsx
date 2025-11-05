import { useApp } from '../context/AppContext'

export default function Toast() {
  const { toast } = useApp()

  if (!toast) return null

  const bgColor = toast.type === 'success' 
    ? 'var(--accent-green)' 
    : '#EF4444'
  const icon = toast.type === 'success' 
    ? 'fas fa-check-circle' 
    : 'fas fa-times-circle'

  return (
    <div style={{
      position: 'fixed',
      bottom: 'var(--spacing-lg)',
      right: 'var(--spacing-lg)',
      background: bgColor,
      color: 'white',
      padding: 'var(--spacing-md) var(--spacing-lg)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-card)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
      zIndex: 10000,
      animation: 'fadeInUp 0.3s ease-out'
    }}>
      <i className={icon} style={{ fontSize: '1.2rem' }}></i>
      <span>{toast.message}</span>
    </div>
  )
}
