import { create } from 'zustand'

const useCourseStore = create((set, get) => ({
  // Course data
  courses: [],
  currentCourse: null,
  isLoading: false,
  error: null,

  // Course creation wizard state
  wizardStep: 1,
  wizardData: {
    title: '',
    description: '',
    skills: [],
    structure: {
      topics: [],
      modules: [],
      lessons: []
    },
    metadata: {
      difficulty: 'intermediate',
      duration: '4 weeks',
      prerequisites: [],
      tags: []
    }
  },

  // Actions
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  // Course actions
  setCourses: (courses) => set({ courses }),
  
  setCurrentCourse: (course) => set({ currentCourse: course }),
  
  addCourse: (course) => set((state) => ({
    courses: [...state.courses, course]
  })),
  
  updateCourse: (id, updates) => set((state) => ({
    courses: state.courses.map(course => 
      course.id === id ? { ...course, ...updates } : course
    )
  })),

  // Wizard actions
  setWizardStep: (step) => set({ wizardStep: step }),
  
  updateWizardData: (data) => set((state) => ({
    wizardData: { ...state.wizardData, ...data }
  })),
  
  resetWizard: () => set({
    wizardStep: 1,
    wizardData: {
      title: '',
      description: '',
      skills: [],
      structure: {
        topics: [],
        modules: [],
        lessons: []
      },
      metadata: {
        difficulty: 'intermediate',
        duration: '4 weeks',
        prerequisites: [],
        tags: []
      }
    }
  }),

  // Async actions
  fetchCourses: async () => {
    set({ isLoading: true, error: null })
    try {
      const api = await import('../services/api')
      const response = await api.default.course.getCourses()
      if (response.success) {
        set({ courses: response.data, isLoading: false })
      } else {
        set({ error: 'Failed to fetch courses', isLoading: false })
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchCourse: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const api = await import('../services/api')
      const response = await api.default.course.getCourse(id)
      if (response.success) {
        set({ currentCourse: response.data, isLoading: false })
      } else {
        set({ error: 'Course not found', isLoading: false })
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  createCourse: async (courseData) => {
    set({ isLoading: true, error: null })
    try {
      const api = await import('../services/api')
      const response = await api.default.course.createCourse(courseData)
      if (response.success) {
        set((state) => ({
          courses: [...state.courses, response.data],
          currentCourse: response.data,
          isLoading: false
        }))
        return response.data
      } else {
        set({ error: 'Failed to create course', isLoading: false })
        return null
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  publishCourse: async (id, publishMode = 'immediate') => {
    set({ isLoading: true, error: null })
    try {
      const api = await import('../services/api')
      const response = await api.default.course.publishCourse(id, publishMode)
      if (response.success) {
        set((state) => ({
          courses: state.courses.map(course => 
            course.id === id ? { ...course, status: 'published', publishedAt: response.data.publishedAt } : course
          ),
          currentCourse: state.currentCourse?.id === id ? 
            { ...state.currentCourse, status: 'published', publishedAt: response.data.publishedAt } : 
            state.currentCourse,
          isLoading: false
        }))
        return response.data
      } else {
        set({ error: 'Failed to publish course', isLoading: false })
        return null
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return null
    }
  }
}))

export default useCourseStore


