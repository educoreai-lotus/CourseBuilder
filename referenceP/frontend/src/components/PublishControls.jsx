import { useState } from 'react'

function PublishControls({ onPublish, isLoading }) {
  const [publishMode, setPublishMode] = useState('immediate')
  const [scheduledDate, setScheduledDate] = useState('')

  const handlePublish = () => {
    const publishData = {
      mode: publishMode,
      scheduledDate: publishMode === 'scheduled' ? scheduledDate : null
    }
    onPublish(publishData)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Publish Course</h3>
      
      <div className="space-y-4">
        {/* Publish Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Publishing Mode
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="publishMode"
                value="immediate"
                checked={publishMode === 'immediate'}
                onChange={(e) => setPublishMode(e.target.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Publish Immediately</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="publishMode"
                value="scheduled"
                checked={publishMode === 'scheduled'}
                onChange={(e) => setPublishMode(e.target.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Schedule for Later</span>
            </label>
          </div>
        </div>

        {/* Scheduled Date */}
        {publishMode === 'scheduled' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Publish Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handlePublish}
            disabled={isLoading || (publishMode === 'scheduled' && !scheduledDate)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Publishing...' : 'Publish Course'}
          </button>
        </div>

        {/* Info */}
        <div className="text-sm text-gray-600">
          <p>
            {publishMode === 'immediate' 
              ? 'Course will be available to learners immediately after publishing.'
              : 'Course will be published at the scheduled date and time.'
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export default PublishControls


