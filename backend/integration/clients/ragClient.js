/**
 * RAG (Retrieval-Augmented Generation) Integration Client
 * Pushes course metadata to RAG graph for semantic search and context
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get RAG API URL from environment
 * @returns {string} RAG API URL
 */
function getApiUrl() {
  const url = process.env.RAG_API_URL || process.env.RAG_URL;
  if (!url) {
    throw new Error('RAG_API_URL or RAG_URL must be set in environment variables');
  }
  return url;
}

/**
 * Get RAG gRPC endpoint (if using gRPC)
 * @returns {string} RAG gRPC endpoint
 */
function getGrpcEndpoint() {
  return process.env.RAG_GRPC_ENDPOINT || null;
}

/**
 * Build RAG metadata payload from course data
 * @param {Object} course - Course entity
 * @param {Array} topics - Topics array
 * @param {Array} modules - Modules array
 * @param {Array} lessons - Lessons array
 * @returns {Object} RAG metadata payload
 */
function buildRAGPayload(course, topics = [], modules = [], lessons = []) {
  return {
    id: course.id,
    type: 'course',
    title: course.course_name,
    description: course.course_description,
    level: course.level,
    status: course.status,
    metadata: {
      course_type: course.course_type,
      duration_hours: course.duration_hours,
      created_at: course.created_at,
      updated_at: course.updated_at,
      learning_path_designation: course.learning_path_designation || {},
      skills: extractSkills(lessons),
      topics: topics.map(t => ({
        id: t.id,
        name: t.topic_name,
        description: t.topic_description
      })),
      modules: modules.map(m => ({
        id: m.id,
        name: m.module_name,
        description: m.module_description
      }))
    },
    content: {
      topics: topics.length,
      modules: modules.length,
      lessons: lessons.length,
      lesson_summaries: lessons.map(l => ({
        id: l.id,
        title: l.lesson_name,
        description: l.lesson_description,
        skills: l.skills || [],
        micro_skills: l.micro_skills || [],
        nano_skills: l.nano_skills || []
      }))
    },
    embeddings: {
      // Placeholder for vector embeddings (if RAG service generates them)
      generated: false
    }
  };
}

/**
 * Extract skills from lessons
 */
function extractSkills(lessons) {
  const skillsSet = new Set();
  lessons.forEach(lesson => {
    if (Array.isArray(lesson.skills)) {
      lesson.skills.forEach(skill => skillsSet.add(skill));
    }
    if (Array.isArray(lesson.micro_skills)) {
      lesson.micro_skills.forEach(skill => skillsSet.add(skill));
    }
    if (Array.isArray(lesson.nano_skills)) {
      lesson.nano_skills.forEach(skill => skillsSet.add(skill));
    }
  });
  return Array.from(skillsSet);
}

/**
 * Push course metadata to RAG service via REST
 * @param {Object} course - Course entity
 * @param {Array} topics - Topics array
 * @param {Array} modules - Modules array
 * @param {Array} lessons - Lessons array
 * @returns {Promise<Object>} RAG service response
 */
export async function pushToRAG(course, topics = [], modules = [], lessons = []) {
  try {
    const payload = buildRAGPayload(course, topics, modules, lessons);
    const apiUrl = getApiUrl();

    // Try REST endpoint first
    const response = await axios.post(
      `${apiUrl}/api/v1/metadata`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.RAG_API_KEY ? `Bearer ${process.env.RAG_API_KEY}` : undefined
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log(`✅ Course metadata pushed to RAG: ${course.course_name} (${course.id})`);
    return {
      success: true,
      ragId: response.data.id || response.data.rag_id,
      message: 'Metadata pushed successfully'
    };
  } catch (error) {
    console.error('[RAG Client] Error pushing metadata:', error.message);
    
    // Don't throw - RAG integration is optional
    return {
      success: false,
      error: error.message,
      message: 'Failed to push metadata to RAG service'
    };
  }
}

/**
 * Push course metadata via gRPC (if gRPC endpoint configured)
 * @param {Object} course - Course entity
 * @param {Array} topics - Topics array
 * @param {Array} modules - Modules array
 * @param {Array} lessons - Lessons array
 * @returns {Promise<Object>} RAG service response
 */
export async function pushToRAGGrpc(course, topics = [], modules = [], lessons = []) {
  try {
    const grpcEndpoint = getGrpcEndpoint();
    
    if (!grpcEndpoint) {
      // Fallback to REST
      return pushToRAG(course, topics, modules, lessons);
    }

    // TODO: Implement gRPC client when proto files are available
    // For now, fallback to REST
    console.warn('[RAG Client] gRPC endpoint configured but not implemented, using REST fallback');
    return pushToRAG(course, topics, modules, lessons);
  } catch (error) {
    console.error('[RAG Client] gRPC error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update course metadata in RAG (when course is updated)
 * @param {Object} course - Updated course entity
 * @param {Array} topics - Topics array
 * @param {Array} modules - Modules array
 * @param {Array} lessons - Lessons array
 * @returns {Promise<Object>} RAG service response
 */
export async function updateRAGMetadata(course, topics = [], modules = [], lessons = []) {
  try {
    const payload = buildRAGPayload(course, topics, modules, lessons);
    const apiUrl = getApiUrl();

    const response = await axios.put(
      `${apiUrl}/api/v1/metadata/${course.id}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.RAG_API_KEY ? `Bearer ${process.env.RAG_API_KEY}` : undefined
        },
        timeout: 10000
      }
    );

    console.log(`✅ Course metadata updated in RAG: ${course.course_name} (${course.id})`);
    return {
      success: true,
      ragId: response.data.id || response.data.rag_id,
      message: 'Metadata updated successfully'
    };
  } catch (error) {
    console.error('[RAG Client] Error updating metadata:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete course metadata from RAG (when course is deleted)
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} RAG service response
 */
export async function deleteRAGMetadata(courseId) {
  try {
    const apiUrl = getApiUrl();

    await axios.delete(
      `${apiUrl}/api/v1/metadata/${courseId}`,
      {
        headers: {
          'Authorization': process.env.RAG_API_KEY ? `Bearer ${process.env.RAG_API_KEY}` : undefined
        },
        timeout: 10000
      }
    );

    console.log(`✅ Course metadata deleted from RAG: ${courseId}`);
    return {
      success: true,
      message: 'Metadata deleted successfully'
    };
  } catch (error) {
    console.error('[RAG Client] Error deleting metadata:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Search courses using RAG semantic search
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Search results
 */
export async function searchRAG(query, options = {}) {
  try {
    const apiUrl = getApiUrl();
    const {
      limit = 10,
      threshold = 0.7,
      filters = {}
    } = options;

    const response = await axios.post(
      `${apiUrl}/api/v1/search`,
      {
        query,
        limit,
        threshold,
        filters
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.RAG_API_KEY ? `Bearer ${process.env.RAG_API_KEY}` : undefined
        },
        timeout: 10000
      }
    );

    return {
      success: true,
      results: response.data.results || [],
      count: response.data.count || 0
    };
  } catch (error) {
    console.error('[RAG Client] Error searching:', error.message);
    return {
      success: false,
      error: error.message,
      results: []
    };
  }
}

export default {
  pushToRAG,
  pushToRAGGrpc,
  updateRAGMetadata,
  deleteRAGMetadata,
  searchRAG
};

