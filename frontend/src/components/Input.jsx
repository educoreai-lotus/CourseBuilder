export default function Input({ label, error, className = '', ...props }) {
  return (
    <label style={{ display: 'block', marginBottom: 'var(--spacing-md)' }}>
      {label && (
        <span style={{
          display: 'block',
          marginBottom: 'var(--spacing-xs)',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          {label}
        </span>
      )}
      <input
        className={className}
        style={{
          width: '100%',
          border: error ? '1px solid #EF4444' : '1px solid var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          transition: 'all 0.3s ease'
        }}
        {...props}
      />
      {error && (
        <span style={{
          display: 'block',
          fontSize: '0.85rem',
          color: '#EF4444',
          marginTop: 'var(--spacing-xs)'
        }}>
          {error}
        </span>
      )}
    </label>
  )
}
