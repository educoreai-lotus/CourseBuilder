import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

export function getCourses(params = {}) {
  return api.get('/courses', { params }).then(r => r.data)
}

export function getCourseById(id) {
  return api.get(`/courses/${id}`).then(r => r.data)
}

export function registerLearner(courseId, body) {
  return api.post(`/courses/${courseId}/register`, body).then(r => r.data)
}

export function submitFeedback(courseId, body) {
  return api.post(`/courses/${courseId}/feedback`, body).then(r => r.data)
}

export function getFeedback(courseId) {
  return api.get(`/feedback/${courseId}`).then(r => r.data)
}

export function createCourse(payload) {
  return api.post('/courses', payload).then(r => r.data)
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

export function getFeedbackAnalytics(courseId) {
  return api.get(`/courses/${courseId}/feedback/analytics`).then(r => r.data)
}

export default {
  getCourses,
  getCourseById,
  registerLearner,
  submitFeedback,
  getFeedback,
  createCourse,
  publishCourse,
  scheduleCourse,
  updateCourse,
  getCourseVersions,
  getFeedbackAnalytics
}


