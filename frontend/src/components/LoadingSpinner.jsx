export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div 
      className="flex items-center justify-center py-10" 
      role="status" 
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-2xl)',
        gap: 'var(--spacing-md)'
      }}
    >
      <div 
        className="loading-spinner"
        style={{
          width: '50px',
          height: '50px',
          border: '3px solid var(--bg-tertiary)',
          borderTop: '3px solid var(--primary-cyan)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <span style={{ 
        color: 'var(--text-secondary)', 
        fontSize: '0.9rem',
        fontWeight: 500
      }}>
        {message}
      </span>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
