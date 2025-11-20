export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  ...props 
}) {
  const base = 'inline-flex items-center justify-center font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98]'
  
  const variants = {
    primary: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-teal-700 active:shadow-md focus-visible:ring-emerald-500',
    secondary: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 hover:from-blue-600 hover:to-indigo-700 active:shadow-md focus-visible:ring-blue-500',
    outline: 'bg-transparent text-emerald-600 border-2 border-emerald-500 rounded-lg hover:bg-emerald-50 hover:border-emerald-600 active:bg-emerald-100 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-emerald-950/20',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg shadow-md shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40 hover:from-red-600 hover:to-rose-700 active:shadow-md focus-visible:ring-red-500',
    purple: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 hover:from-purple-600 hover:to-pink-700 active:shadow-md focus-visible:ring-purple-500',
    green: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-md shadow-green-500/30 hover:shadow-lg hover:shadow-green-500/40 hover:from-green-600 hover:to-emerald-700 active:shadow-md focus-visible:ring-green-500'
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-md',
    md: 'px-6 py-3 text-sm rounded-lg',
    lg: 'px-8 py-4 text-base rounded-lg'
  }
  
  return (
    <button 
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  )
}
