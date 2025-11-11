import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { 
  ChevronDown, 
  ChevronRight, 
  Play, 
  Clock, 
  CheckCircle, 
  BookOpen,
  Folder,
  FileText
} from 'lucide-react'

function CourseStructure({ courseId, currentLessonId }) {
  const [topics, setTopics] = useState([])
  const [expandedTopics, setExpandedTopics] = useState({})
  const [expandedModules, setExpandedModules] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourseStructure()
  }, [courseId])

  const loadCourseStructure = async () => {
    try {
      setLoading(true)
      const response = await api.course.getCourseTopics(courseId)
      if (response.success) {
        setTopics(response.data)
        // Auto-expand first topic
        if (response.data.length > 0) {
          setExpandedTopics({ [response.data[0].id]: true })
        }
      }
    } catch (error) {
      console.error('Failed to load course structure:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTopic = (topicId) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }))
  }

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }))
  }

  const getLessonIcon = (lesson) => {
    switch (lesson.type) {
      case 'video':
        return <Play className="w-4 h-4 text-blue-500" />
      case 'interactive':
        return <FileText className="w-4 h-4 text-green-500" />
      case 'assessment':
        return <CheckCircle className="w-4 h-4 text-purple-500" />
      case 'project':
        return <BookOpen className="w-4 h-4 text-orange-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getLessonStatus = (lesson) => {
    if (lesson.completed) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    if (lesson.id === currentLessonId) {
      return <div className="w-4 h-4 rounded-full bg-blue-500"></div>
    }
    return <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-100 rounded ml-4"></div>
              <div className="h-4 bg-gray-100 rounded ml-8"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Course Content</h3>
        <p className="text-sm text-gray-500">Click to expand topics and modules</p>
      </div>
      
      <div className="p-4 space-y-2">
        {topics.map((topic) => (
          <div key={topic.id} className="border border-gray-200 rounded-lg">
            {/* Topic Header */}
            <div 
              className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
              onClick={() => toggleTopic(topic.id)}
            >
              <div className="flex items-center space-x-3">
                {expandedTopics[topic.id] ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
                <Folder className="w-5 h-5 text-blue-500" />
                <div>
                  <h4 className="font-medium text-gray-900">{topic.title}</h4>
                  <p className="text-sm text-gray-500">{topic.description}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {topic.modules?.length || 0} modules
              </div>
            </div>

            {/* Modules */}
            {expandedTopics[topic.id] && topic.modules?.map((module) => (
              <div key={module.id} className="border-t border-gray-100">
                {/* Module Header */}
                <div 
                  className="p-3 pl-8 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => toggleModule(module.id)}
                >
                  <div className="flex items-center space-x-3">
                    {expandedModules[module.id] ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <BookOpen className="w-4 h-4 text-green-500" />
                    <div>
                      <h5 className="font-medium text-gray-800">{module.title}</h5>
                      <p className="text-sm text-gray-500">{module.description}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {module.lessons?.length || 0} lessons
                  </div>
                </div>

                {/* Lessons */}
                {expandedModules[module.id] && module.lessons?.map((lesson) => (
                  <div key={lesson.id} className="border-t border-gray-100">
                    <Link
                      to={`/course/${courseId}/lesson/${lesson.id}`}
                      className={`p-3 pl-12 hover:bg-gray-50 flex items-center justify-between group ${
                        lesson.id === currentLessonId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {getLessonIcon(lesson)}
                        <div>
                          <h6 className="font-medium text-gray-800 group-hover:text-blue-600">
                            {lesson.title}
                          </h6>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{lesson.duration}</span>
                            <span>•</span>
                            <span className="capitalize">{lesson.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getLessonStatus(lesson)}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CourseStructure
