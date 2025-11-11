// API service for Course Builder
// Connects to Railway backend API

// Backend API base URL from environment variable
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper function for delays (for mock operations)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`
  console.log(`🌐 Making API request to: ${url}`)
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    // Check if response is HTML (error page) instead of JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error(`❌ Received HTML instead of JSON from ${url}:`, text.substring(0, 200))
      throw new Error(`Server returned HTML instead of JSON. Check if backend is running at ${API_BASE}`)
    }
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`)
    }
    
    return data
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

// Course API functions
export const courseAPI = {
  // Get all courses
  async getCourses() {
    try {
      return await apiRequest('/courses')
    } catch (error) {
      console.error("Failed to load courses:", error)
      return { success: false, data: [] }
    }
  },

  // Get single course by ID
  async getCourse(id) {
    try {
      return await apiRequest(`/courses/${id}`)
    } catch (error) {
      console.error(`Failed to load course ${id}:`, error)
      return { success: false, data: null }
    }
  },

  // Get lessons for a course
  async getCourseLessons(id) {
    try {
      return await apiRequest(`/courses/${id}/lessons`)
    } catch (error) {
      console.error(`Failed to load lessons for course ${id}:`, error)
      return { success: false, data: [] }
    }
  },

  // Get course topics
  async getCourseTopics(courseId) {
    try {
      return await apiRequest(`/courses/${courseId}/topics`)
    } catch (error) {
      console.error(`Failed to load topics for course ${courseId}:`, error)
      return { success: false, data: [] }
    }
  },

  // Get topic modules
  async getTopicModules(courseId, topicId) {
    try {
      return await apiRequest(`/courses/${courseId}/topics/${topicId}/modules`)
    } catch (error) {
      console.error(`Failed to load modules for topic ${topicId}:`, error)
      return { success: false, data: [] }
    }
  },

  // Get module lessons
  async getModuleLessons(courseId, topicId, moduleId) {
    try {
      return await apiRequest(`/courses/${courseId}/topics/${topicId}/modules/${moduleId}/lessons`)
    } catch (error) {
      console.error(`Failed to load lessons for module ${moduleId}:`, error)
      return { success: false, data: [] }
    }
  },

  // Create new course
  async createCourse(courseData) {
    try {
      return await apiRequest('/courses', {
        method: 'POST',
        body: JSON.stringify(courseData)
      })
    } catch (error) {
      console.error("Failed to create course:", error)
      return { success: false, data: null }
    }
  },

  // Publish course
  async publishCourse(id, publishMode = 'immediate') {
    try {
      return await apiRequest(`/courses/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ publishMode })
      })
    } catch (error) {
      console.error(`Failed to publish course ${id}:`, error)
      return { success: false, data: null }
    }
  }
}

// Skills Engine API functions
export const skillsAPI = {
  // Expand skills using Skills Engine
  async expandSkills(description, generalSkills = []) {
    try {
      return await apiRequest('/skills/expand', {
        method: 'POST',
        body: JSON.stringify({ description, generalSkills })
      })
    } catch (error) {
      console.error("Failed to expand skills:", error)
      return { success: false, data: { expandedSkills: [] } }
    }
  }
}

// Content Studio API functions
export const contentAPI = {
  // Generate lessons from Content Studio
  async generateLessons(courseId, structure, skills) {
    try {
      return await apiRequest('/content/generate', {
        method: 'POST',
        body: JSON.stringify({ courseId, structure, skills })
      })
    } catch (error) {
      console.error("Failed to generate lessons:", error)
      return { success: false, data: { generatedContent: { lessons: [] } } }
    }
  }
}

// Assessment API functions
export const assessmentAPI = {
  // Start assessment
  async startAssessment(learnerId, courseId, coverageMap) {
    try {
      return await apiRequest('/assessment/start', {
        method: 'POST',
        body: JSON.stringify({ learnerId, courseId, coverageMap })
      })
    } catch (error) {
      console.error("Failed to start assessment:", error)
      return { success: false, data: null }
    }
  },

  // Get assessment report
  async getAssessmentReport(assessmentId) {
    try {
      return await apiRequest(`/assessment/${assessmentId}/report`)
    } catch (error) {
      console.error(`Failed to load assessment report ${assessmentId}:`, error)
      return { success: false, data: null }
    }
  }
}

// User API functions
export const userAPI = {
  // Register learner for course
  async registerLearner(courseId, learnerId) {
    try {
      return await apiRequest(`/courses/${courseId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ learnerId })
      })
    } catch (error) {
      console.error(`Failed to register learner for course ${courseId}:`, error)
      return { success: false, data: null }
    }
  },

  // Submit feedback
  async submitFeedback(courseId, learnerId, rating, comments) {
    try {
      return await apiRequest(`/courses/${courseId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ learnerId, rating, comments })
      })
    } catch (error) {
      console.error(`Failed to submit feedback for course ${courseId}:`, error)
      return { success: false, data: null }
    }
  },

  // Get user progress
  async getUserProgress(learnerId) {
    try {
      return await apiRequest(`/user/${learnerId}/progress`)
    } catch (error) {
      console.error(`Failed to load user progress for ${learnerId}:`, error)
      return { success: false, data: null }
    }
  },

  // Get user achievements
  async getUserAchievements(learnerId) {
    try {
      return await apiRequest(`/user/${learnerId}/achievements`)
    } catch (error) {
      console.error(`Failed to load user achievements for ${learnerId}:`, error)
      return { success: false, data: [] }
    }
  },

  // Update lesson progress
  async updateLessonProgress(learnerId, courseId, lessonId, completed) {
    try {
      return await apiRequest(`/user/${learnerId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ courseId, lessonId, completed })
      })
    } catch (error) {
      console.error("Failed to update lesson progress:", error)
      return { success: false, data: null }
    }
  },

  // Update lesson progress (specific endpoint)
  async updateLessonProgressById(lessonId, learnerId, courseId, completed) {
    try {
      return await apiRequest(`/lessons/${lessonId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ learnerId, courseId, completed })
      })
    } catch (error) {
      console.error("Failed to update lesson progress:", error)
      return { success: false, data: null }
    }
  }
}

// Learning Paths API functions
export const learningPathsAPI = {
  // Get all learning paths
  async getLearningPaths() {
    try {
      return await apiRequest('/learning-paths')
    } catch (error) {
      console.error("Failed to load learning paths:", error)
      return { success: false, data: [] }
    }
  },

  // Get learning path by ID
  async getLearningPath(pathId) {
    try {
      return await apiRequest(`/learning-paths/${pathId}`)
    } catch (error) {
      console.error(`Failed to load learning path ${pathId}:`, error)
      return { success: false, data: null }
    }
  },

  // Enroll in learning path
  async enrollInPath(pathId, learnerId) {
    try {
      return await apiRequest(`/learning-paths/${pathId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ learnerId })
      })
    } catch (error) {
      console.error(`Failed to enroll in learning path ${pathId}:`, error)
      return { success: false, data: null }
    }
  }
}

// Achievements API functions
export const achievementsAPI = {
  // Get user achievements
  async getUserAchievements(learnerId) {
    try {
      return await apiRequest(`/user/${learnerId}/achievements`)
    } catch (error) {
      console.error(`Failed to load user achievements for ${learnerId}:`, error)
      return { success: false, data: [] }
    }
  },

  // Get leaderboards
  async getLeaderboards() {
    try {
      return await apiRequest('/achievements/leaderboards')
    } catch (error) {
      console.error("Failed to load leaderboards:", error)
      return { success: false, data: [] }
    }
  },

  // Award achievement
  async awardAchievement(learnerId, achievementId) {
    try {
      return await apiRequest('/achievements/award', {
        method: 'POST',
        body: JSON.stringify({ learnerId, achievementId })
      })
    } catch (error) {
      console.error("Failed to award achievement:", error)
      return { success: false, data: null }
    }
  }
}

// Export all APIs
export default {
  course: courseAPI,
  skills: skillsAPI,
  content: contentAPI,
  assessment: assessmentAPI,
  user: userAPI,
  learningPaths: learningPathsAPI,
  achievements: achievementsAPI
}