import { useState } from 'react'

function FeedbackForm({ onSubmit, isLoading }) {
  const [rating, setRating] = useState(0)
  const [comments, setComments] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ rating, comments })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          How would you rate this course?
        </label>
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-3xl transition-colors ${
                star <= rating 
                  ? 'text-yellow-400' 
                  : 'text-gray-300 hover:text-yellow-400'
              }`}
            >
              ⭐
            </button>
          ))}
        </div>
        <div className="text-center mt-2 text-sm text-gray-600">
          {rating === 0 && 'Click a star to rate'}
          {rating === 1 && 'Poor'}
          {rating === 2 && 'Fair'}
          {rating === 3 && 'Good'}
          {rating === 4 && 'Very Good'}
          {rating === 5 && 'Excellent'}
        </div>
      </div>

      {/* Comments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Comments (Optional)
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Share your thoughts about the course..."
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={rating === 0 || isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </form>
  )
}

export default FeedbackForm


