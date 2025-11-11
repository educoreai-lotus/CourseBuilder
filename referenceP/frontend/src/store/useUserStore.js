import { create } from 'zustand'

const useUserStore = create((set, get) => ({
  // User data
  currentUser: null,
  userRole: null, // 'trainer' or 'learner'
  enrolledCourses: [],
  progress: {}, // courseId -> progress data
  isLoading: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  // User management
  setUser: (user, role) => set({ 
    currentUser: user, 
    userRole: role 
  }),

  // Mock user data (in production, this would come from auth microservice)
  loginAsTrainer: () => set({
    currentUser: {
      id: 'trainer_001',
      name: 'John Doe',
      email: 'john@example.com'
    },
    userRole: 'trainer'
  }),

  loginAsLearner: () => set({
    currentUser: {
      id: 'learner_001',
      name: 'Sarah Wilson',
      email: 'sarah@example.com'
    },
    userRole: 'learner'
  }),
  
  logout: () => set({ 
    currentUser: null, 
    userRole: null,
    enrolledCourses: [],
    progress: {}
  }),

  // Course enrollment
  enrollInCourse: (courseId) => set((state) => ({
    enrolledCourses: [...state.enrolledCourses, courseId],
    progress: {
      ...state.progress,
      [courseId]: {
        completedLessons: [],
        currentModule: null,
        progressPercentage: 0,
        startedAt: new Date().toISOString()
      }
    }
  })),

  // Progress tracking
  updateProgress: (courseId, lessonId, completed = true) => set((state) => {
    const currentProgress = state.progress[courseId] || {
      completedLessons: [],
      currentModule: null,
      progressPercentage: 0,
      startedAt: new Date().toISOString()
    }

    const updatedLessons = completed 
      ? [...new Set([...currentProgress.completedLessons, lessonId])]
      : currentProgress.completedLessons.filter(id => id !== lessonId)

    return {
      progress: {
        ...state.progress,
        [courseId]: {
          ...currentProgress,
          completedLessons: updatedLessons,
          progressPercentage: Math.round((updatedLessons.length / 10) * 100) // Assuming 10 lessons per course
        }
      }
    }
  }),

  getCourseProgress: (courseId) => {
    const state = get()
    return state.progress[courseId] || {
      completedLessons: [],
      currentModule: null,
      progressPercentage: 0,
      startedAt: null,
      lastAccessed: null
    }
  },

  updateCourseProgress: (courseId, progressPercentage, lastAccessed) => set((state) => ({
    progress: {
      ...state.progress,
      [courseId]: {
        ...state.progress[courseId],
        progressPercentage,
        lastAccessed
      }
    }
  })),

  isEnrolled: (courseId) => {
    const state = get()
    return state.enrolledCourses.includes(courseId)
  },

  // Async actions
  registerForCourse: async (courseId) => {
    set({ isLoading: true, error: null })
    try {
      const { userAPI } = await import('../services/api')
      const response = await userAPI.registerLearner(courseId, get().currentUser?.id)
      if (response.success) {
        get().enrollInCourse(courseId)
        set({ isLoading: false })
        return response.data
      } else {
        set({ error: 'Failed to register for course', isLoading: false })
        return null
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  submitFeedback: async (courseId, rating, comments) => {
    set({ isLoading: true, error: null })
    try {
      const { userAPI } = await import('../services/api')
      const response = await userAPI.submitFeedback(
        courseId, 
        get().currentUser?.id, 
        rating, 
        comments
      )
      if (response.success) {
        set({ isLoading: false })
        return response.data
      } else {
        set({ error: 'Failed to submit feedback', isLoading: false })
        return null
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return null
    }
  }
}))

export default useUserStore
