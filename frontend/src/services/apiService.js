import axios from 'axios'
import { enrichAssets as enrichAssetsRequest } from '../features/enrichment/services/enrichmentAPI.js'

// Ensure baseURL always ends with /api/v1
const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
  // If URL doesn't end with /api/v1, append it
  if (!envURL.endsWith('/api/v1')) {
    return envURL.endsWith('/') ? `${envURL}api/v1` : `${envURL}/api/v1`
  }
  return envURL
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' }
})

const roleProfiles = {
  learner: {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Alice Learner'
  },
  trainer: {
    id: '20000000-0000-0000-0000-000000000001',
    name: 'Tristan Trainer'
  }
}

const getStoredRole = () => {
  if (typeof window === 'undefined') {
    return 'learner'
  }
  const stored = window.localStorage.getItem('coursebuilder:userRole')
  return stored && Object.keys(roleProfiles).includes(stored) ? stored : 'learner'
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const role = getStoredRole()
    const profile = roleProfiles[role]
    if (profile) {
      config.headers['X-User-Role'] = role
      config.headers['X-User-Id'] = profile.id
      config.headers['X-User-Name'] = profile.name
    }
    
    // Add trainer-specific headers for trainer requests
    if (role === 'trainer') {
      config.headers['x-user-role'] = 'trainer'
      config.headers['x-service-id'] = 'CourseBuilder'
      if (import.meta.env.VITE_SERVICE_API_KEY) {
        config.headers['x-api-key'] = import.meta.env.VITE_SERVICE_API_KEY
      }
    }
  }
  return config
})

export function getCourses(params = {}) {
  return api.get('/courses', { params }).then(r => r.data)
}

export function getCourseById(id, params = {}) {
  return api.get(`/courses/${id}`, { params }).then(r => r.data)
}

export function registerLearner(courseId, body) {
  return api.post(`/courses/${courseId}/register`, body).then(r => r.data)
}

export function cancelEnrollment(courseId, body) {
  return api.delete(`/courses/${courseId}/enrollment`, { data: body }).then(r => r.data)
}

export function submitFeedback(courseId, body) {
  return api.post(`/courses/${courseId}/feedback`, body).then(r => r.data)
}

// Get aggregated feedback for a course (for trainers/admins)
export function getFeedback(courseId) {
  return api.get(`/feedback/${courseId}`).then(r => r.data)
}

export function getMyFeedback(courseId) {
  return api.get(`/courses/${courseId}/feedback/self`)
    .then(r => r.data)
    .catch(err => {
      // 404 is normal - learner hasn't submitted feedback yet
      // Return null instead of throwing to avoid initialization errors
      // Safely check for 404 without accessing properties that might cause issues
      let is404 = false
      try {
        if (err && typeof err === 'object') {
          const response = 'response' in err ? err.response : null
          if (response && typeof response === 'object' && 'status' in response) {
            is404 = response.status === 404
          }
        }
      } catch (checkErr) {
        // Ignore property access errors - assume it's not a 404
      }
      
      if (is404) {
        return null
      }
      
      // Re-throw other errors
      throw err
    })
}

export function updateFeedback(courseId, body) {
  return api.put(`/courses/${courseId}/feedback`, body).then(r => r.data)
}

export function deleteFeedback(courseId) {
  return api.delete(`/courses/${courseId}/feedback`).then(r => r.data)
}

// Trainer API calls - these require trainer headers (added via interceptor)
export function createCourse(payload) {
  return api.post('/courses', payload).then(r => r.data)
}
export function validateCourse(courseId) {
  return api.post(`/courses/${courseId}/validate`).then(r => r.data)
}

export function publishCourse(courseId) {
  return api.post(`/courses/${courseId}/publish`).then(r => r.data)
}

export function scheduleCourse(courseId, payload) {
  return api.post(`/courses/${courseId}/schedule`, payload).then(r => r.data)
}

export function updateCourse(courseId, payload) {
  return api.put(`/courses/${courseId}`, payload).then(r => r.data)
}

export function getCourseVersions(courseId) {
  return api.get(`/courses/${courseId}/versions`).then(r => r.data)
}

export function getFeedbackAnalytics(courseId, params = {}) {
  return api.get(`/courses/${courseId}/feedback/analytics`, { params }).then(r => r.data)
}

export function getCourseFilters() {
  return api.get('/courses/filters').then(r => r.data)
}

export function unpublishCourse(courseId) {
  return api.post(`/courses/${courseId}/unpublish`).then(r => r.data)
}

export function triggerPersonalizedCourse(payload) {
  return api.post('/ai/trigger-personalized-course', payload).then(r => r.data)
}

export function getLessonById(lessonId) {
  return api.get(`/lessons/${lessonId}`).then(r => r.data)
}

export function getLessonExercises(lessonId) {
  // Fetch exercises as HTML (AJAX)
  const baseURL = getBaseURL()
  return fetch(`${baseURL}/lessons/${lessonId}/exercises`, {
    method: 'GET',
    headers: {
      'Content-Type': 'text/html'
    }
  }).then(async (response) => {
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Failed to load exercises')
    }
    return response.text() // Return HTML string
  })
}

export function getLearnerProgress(learnerId) {
  return api.get(`/courses/learners/${learnerId}/progress`).then(r => r.data)
}

export function updateCourseProgress(courseId, body) {
  return api.patch(`/courses/${courseId}/progress`, body).then(r => r.data)
}

export const fetchEnrichmentAssets = (payload) => enrichAssetsRequest(payload)

export default {
  getCourses,
  getCourseById,
  registerLearner,
  submitFeedback,
  getFeedback,
  getMyFeedback,
  updateFeedback,
  deleteFeedback,
  createCourse,
  validateCourse,
  publishCourse,
  scheduleCourse,
  updateCourse,
  getCourseVersions,
  getFeedbackAnalytics,
  getCourseFilters,
  unpublishCourse,
  triggerPersonalizedCourse,
  getLessonById,
  getLessonExercises,
  getLearnerProgress,
  updateCourseProgress,
  fetchEnrichmentAssets
}


