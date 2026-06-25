import axios from 'axios'
import { enrichAssets as enrichAssetsRequest } from '../features/enrichment/services/enrichmentAPI.js'
import { getAuthToken, applyRotatedTokenFromHeaders, clearAuthToken } from '../auth/tokenStorage.js'
import { getApiUrl, getNauthFrontendUrl, isDev } from '../config/env.js'

// Ensure baseURL always ends with /api/v1
export const getBaseURL = () => {
  const envURL = getApiUrl()
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
    id: '50a630f4-826e-45aa-8f70-653e5e592fc3',
    name: 'Dev Learner'
  },
  trainer: {
    id: '20000000-0000-0000-0000-000000000001',
    name: 'Dev Trainer'
  }
}

const getStoredRole = () => {
  if (typeof window === 'undefined') {
    return 'learner'
  }
  const stored = window.localStorage.getItem('coursebuilder:userRole')
  return stored && Object.keys(roleProfiles).includes(stored) ? stored : 'learner'
}

const isDevMockMode = () => isDev() && !getAuthToken()

const redirectToSignIn = () => {
  if (typeof window === 'undefined') {
    return
  }
  if (window.location.pathname === '/sign-in-required') {
    return
  }
  const loginUrl = getNauthFrontendUrl()
  if (loginUrl) {
    window.location.href = `${loginUrl.replace(/\/+$/, '')}/login`
    return
  }
  window.location.href = '/sign-in-required'
}

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else if (isDevMockMode()) {
    const role = getStoredRole()
    const profile = roleProfiles[role]
    if (profile) {
      config.headers['X-User-Role'] = role
      config.headers['X-User-Id'] = profile.id
      config.headers['X-User-Name'] = profile.name
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    if (response?.headers) {
      applyRotatedTokenFromHeaders(response.headers)
    }
    return response
  },
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      console.warn('[CourseBuilder Auth] API returned 401; clearing auth token')
      clearAuthToken()
      redirectToSignIn()
    }
    return Promise.reject(error)
  }
)

export function getCourses(params = {}) {
  return api.get('/courses', { params }).then((r) => r.data)
}

export function fetchAuthContext() {
  return api.get('/auth/context').then((r) => r.data)
}

export function getCourseById(id, params = {}) {
  return api.get(`/courses/${id}`, { params }).then((r) => r.data)
}

export async function fetchEnrollmentStatus(courseId, learnerId) {
  if (!learnerId) {
    return { enrolled: false, progress: 0, completedLessons: 0 }
  }

  try {
    const params = { learner_id: learnerId }
    const response = await api.get(`/courses/${courseId}/enrollment-status`, { params })
    return response.data
  } catch (error) {
    console.error('Error fetching enrollment status:', error)
    return { enrolled: false, progress: 0, completedLessons: 0 }
  }
}

export function registerLearner(courseId, body) {
  return api.post(`/courses/${courseId}/register`, body).then((r) => r.data)
}

export function cancelEnrollment(courseId, body) {
  return api.delete(`/courses/${courseId}/enrollment`, { data: body }).then((r) => r.data)
}

export function submitFeedback(courseId, body) {
  return api.post(`/courses/${courseId}/feedback`, body).then((r) => r.data)
}

export function getFeedback(courseId) {
  return api.get(`/feedback/${courseId}`).then((r) => r.data)
}

export function getMyFeedback(courseId) {
  return api
    .get(`/courses/${courseId}/feedback/self`)
    .then((r) => r.data)
    .catch((err) => {
      let is404 = false
      try {
        if (err && typeof err === 'object') {
          const response = 'response' in err ? err.response : null
          if (response && typeof response === 'object' && 'status' in response) {
            is404 = response.status === 404
          }
        }
      } catch {
        // ignore
      }

      if (is404) {
        return null
      }

      throw err
    })
}

export function updateFeedback(courseId, body) {
  return api.put(`/courses/${courseId}/feedback`, body).then((r) => r.data)
}

export function deleteFeedback(courseId) {
  return api.delete(`/courses/${courseId}/feedback`).then((r) => r.data)
}

export function createCourse(payload) {
  return api.post('/courses', payload).then((r) => r.data)
}

export function validateCourse(courseId) {
  return api.post(`/courses/${courseId}/validate`).then((r) => r.data)
}

export function publishCourse(courseId) {
  return api.post(`/courses/${courseId}/publish`).then((r) => r.data)
}

export function scheduleCourse(courseId, payload) {
  return api.post(`/courses/${courseId}/schedule`, payload).then((r) => r.data)
}

export function updateCourse(courseId, payload) {
  return api.put(`/courses/${courseId}`, payload).then((r) => r.data)
}

export function getCourseVersions(courseId) {
  return api.get(`/courses/${courseId}/versions`).then((r) => r.data)
}

export function getFeedbackAnalytics(courseId, params = {}) {
  return api.get(`/courses/${courseId}/feedback/analytics`, { params }).then((r) => r.data)
}

export function getCourseFilters() {
  return api.get('/courses/filters').then((r) => r.data)
}

export function unpublishCourse(courseId) {
  return api.post(`/courses/${courseId}/unpublish`).then((r) => r.data)
}

export function getLessonById(lessonId) {
  return api.get(`/lessons/${lessonId}`).then((r) => r.data)
}

export function getLessonExercises(lessonId) {
  const baseURL = getBaseURL()
  const headers = { 'Content-Type': 'text/html' }
  const token = getAuthToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return fetch(`${baseURL}/lessons/${lessonId}/exercises`, {
    method: 'GET',
    headers
  }).then(async (response) => {
    applyRotatedTokenFromHeaders(response.headers)

    if (response.status === 401) {
      clearAuthToken()
      redirectToSignIn()
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Failed to load exercises')
    }
    return response.text()
  })
}

export function getLearnerProgress(learnerId) {
  return api.get(`/courses/learners/${learnerId}/progress`).then((r) => r.data)
}

export function updateCourseProgress(courseId, body) {
  return api.patch(`/courses/${courseId}/progress`, body).then((r) => r.data)
}

export function startAssessment(courseId, body = {}) {
  return api.post(`/courses/${courseId}/assessment/start`, body).then((r) => r.data)
}

export const fetchEnrichmentAssets = (payload) => enrichAssetsRequest(payload)

export default {
  getCourses,
  fetchAuthContext,
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
  getLessonById,
  getLessonExercises,
  getLearnerProgress,
  updateCourseProgress,
  fetchEnrichmentAssets
}
