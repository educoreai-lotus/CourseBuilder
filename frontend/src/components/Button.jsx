export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  ...props 
}) {
  const base = 'btn'
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    danger: 'btn-danger'
  }
  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  }
  
  return (
    <button 
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  )
}
