export default function Card({ children, className = '', onClick, style = {} }) {
  return (
    <div
      className={`card ${className}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {children}
    </div>
  )
}
