import { useState } from 'react'

function LessonViewer({ lesson, onComplete }) {
  const [showExercise, setShowExercise] = useState(false)
  const [exerciseCompleted, setExerciseCompleted] = useState(false)

  const handleCompleteLesson = () => {
    if (lesson.exercises.length > 0 && !exerciseCompleted) {
      setShowExercise(true)
    } else {
      onComplete()
    }
  }

  const handleExerciseComplete = () => {
    setExerciseCompleted(true)
    setShowExercise(false)
  }

  return (
    <div className="space-y-6">
      {/* Lesson Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h2>
        <div className="flex items-center text-sm text-gray-500 space-x-4">
          <span>⏱️ {lesson.duration}</span>
          <span>📚 Lesson Content</span>
        </div>
      </div>

      {/* Lesson Content */}
      <div className="prose max-w-none">
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="text-gray-700 leading-relaxed">{lesson.content}</p>
        </div>
      </div>

      {/* Exercise Section */}
      {lesson.exercises.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Exercise</h3>
          <div className="space-y-4">
            {lesson.exercises.map((exercise, index) => (
              <div key={exercise.id} className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Exercise {index + 1}: {exercise.description}
                    </h4>
                    <div className="text-sm text-gray-600 mb-3">
                      Type: {exercise.type}
                    </div>
                    {showExercise && (
                      <div className="bg-gray-50 p-3 rounded border">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                          {exercise.solution}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          {lesson.exercises.length > 0 && !exerciseCompleted && (
            <span>Complete the exercise to continue</span>
          )}
        </div>
        
        <div className="flex space-x-4">
          {lesson.exercises.length > 0 && !exerciseCompleted && !showExercise && (
            <button
              onClick={() => setShowExercise(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Show Exercise
            </button>
          )}
          
          {showExercise && (
            <button
              onClick={handleExerciseComplete}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Mark Exercise Complete
            </button>
          )}
          
          <button
            onClick={handleCompleteLesson}
            disabled={lesson.exercises.length > 0 && !exerciseCompleted}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Lesson
          </button>
        </div>
      </div>
    </div>
  )
}

export default LessonViewer


