function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="loading">
      <div className="loading-spinner"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  )
}

export default LoadingSpinner