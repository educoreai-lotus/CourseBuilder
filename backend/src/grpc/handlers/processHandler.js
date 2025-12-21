import courseRepository from '../../../repositories/CourseRepository.js';
import db from '../../../config/database.js';

/**
 * Process RPC Handler
 * Handles both Real-time queries and Batch sync requests
 */
class ProcessHandler {
  /**
   * Handle Process RPC call
   * @param {Object} call - GRPC call object
   * @param {Function} callback - Response callback
   */
  async handle(call, callback) {
    const startTime = Date.now();
    let envelope;

    try {
      // 1. Parse envelope from request
      const envelopeJson = call.request.envelope_json;
      envelope = JSON.parse(envelopeJson);

      const {
        request_id,
        tenant_id,
        user_id,
        target_service,
        payload,
        metadata
      } = envelope;

      console.log('[GRPC Process] Request received', {
        service: process.env.SERVICE_NAME || 'course-builder',
        request_id,
        tenant_id,
        user_id,
        target_service,
        has_payload: !!payload,
        sync_type: payload?.sync_type
      });

      // 2. Detect mode: Real-time or Batch Sync
      const isBatchSync = payload?.sync_type === 'batch';

      let result;

      if (isBatchSync) {
        // ═══════════════════════════════════════
        // MODE 1: BATCH SYNC
        // ═══════════════════════════════════════
        console.log('[GRPC Process - BATCH SYNC] Processing batch request', {
          service: process.env.SERVICE_NAME || 'course-builder',
          request_id,
          page: payload.page,
          limit: payload.limit,
          since: payload.since
        });

        result = await this.handleBatchSync(envelope);

      } else {
        // ═══════════════════════════════════════
        // MODE 2: REAL-TIME QUERY
        // ═══════════════════════════════════════
        console.log('[GRPC Process - REAL-TIME] Processing query', {
          service: process.env.SERVICE_NAME || 'course-builder',
          request_id,
          query: payload?.query,
          context: payload?.context
        });

        result = await this.handleRealtimeQuery(envelope);
      }

      // 3. Build response envelope
      const responseEnvelope = {
        request_id,
        success: true,
        data: result.data,  // ⚠️ CRITICAL: Must be array or {items: []}
        metadata: {
          ...(result.metadata || {}),
          processed_at: new Date().toISOString(),
          service: process.env.SERVICE_NAME || 'course-builder',
          duration_ms: Date.now() - startTime,
          mode: isBatchSync ? 'batch' : 'realtime'
        }
      };

      console.log('[GRPC Process] Request completed', {
        service: process.env.SERVICE_NAME || 'course-builder',
        request_id,
        duration_ms: Date.now() - startTime,
        mode: isBatchSync ? 'batch' : 'realtime',
        success: true
      });

      // 4. Return ProcessResponse
      callback(null, {
        success: true,
        envelope_json: JSON.stringify(responseEnvelope),
        error: ''
      });

    } catch (error) {
      console.error('[GRPC Process] Request failed', {
        service: process.env.SERVICE_NAME || 'course-builder',
        request_id: envelope?.request_id,
        error: error.message,
        stack: error.stack,
        duration_ms: Date.now() - startTime
      });

      // Return error response
      callback(null, {
        success: false,
        envelope_json: JSON.stringify({
          request_id: envelope?.request_id,
          success: false,
          error: error.message,
          metadata: {
            processed_at: new Date().toISOString(),
            service: process.env.SERVICE_NAME || 'course-builder'
          }
        }),
        error: error.message
      });
    }
  }

  /**
   * Handle Batch Sync request
   * @param {Object} envelope - Request envelope
   * @returns {Promise<Object>} Result with data
   */
  async handleBatchSync(envelope) {
    const {
      tenant_id,
      payload
    } = envelope;

    const {
      page = 1,
      limit = 1000,
      since
    } = payload;

    console.log('[Batch Sync] Fetching courses', {
      service: process.env.SERVICE_NAME || 'course-builder',
      tenant_id,
      page,
      limit,
      since
    });

    // Query database with pagination
    const offset = (page - 1) * limit;
    const data = await this.queryDatabase({
      tenant_id,
      limit,
      offset,
      since
    });

    // Check if there are more records
    const totalCount = await this.getTotalCount({
      tenant_id,
      since
    });
    const hasMore = (page * limit) < totalCount;

    console.log('[Batch Sync] Courses fetched', {
      service: process.env.SERVICE_NAME || 'course-builder',
      tenant_id,
      page,
      records: data.length,
      total: totalCount,
      has_more: hasMore
    });

    // ⚠️ CRITICAL: Return format MUST be { items: [...] }
    return {
      data: {
        items: data,        // ⭐ Your actual data array
        page,
        limit,
        total: totalCount
      },
      metadata: {
        has_more: hasMore,
        page,
        total_pages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Handle Real-time Query
   * @param {Object} envelope - Request envelope
   * @returns {Promise<Object>} Result with data
   */
  async handleRealtimeQuery(envelope) {
    const {
      tenant_id,
      user_id,
      payload
    } = envelope;

    const query = payload?.query || '';

    console.log('[Real-time Query] Processing', {
      service: process.env.SERVICE_NAME || 'course-builder',
      tenant_id,
      user_id,
      query
    });

    // Parse query and execute appropriate action
    let data;
    
    if (query.includes('recent') || query.includes('latest')) {
      data = await this.getRecentItems(tenant_id, user_id);
      
    } else if (query.includes('id') || query.includes('show') || query.includes('course')) {
      const id = this.extractId(query);
      if (id) {
        const course = await this.getItemById(tenant_id, id);
        data = course ? [course] : [];
      } else {
        data = await this.getDefaultData(tenant_id, user_id);
      }
      
    } else {
      // Default action - return recent courses
      data = await this.getDefaultData(tenant_id, user_id);
    }

    console.log('[Real-time Query] Data fetched', {
      service: process.env.SERVICE_NAME || 'course-builder',
      tenant_id,
      user_id,
      records: Array.isArray(data) ? data.length : 1
    });

    // ⚠️ CRITICAL: Return data as direct array (not wrapped!)
    return {
      data: data,  // ⭐ Direct array of items
      metadata: {
        query_type: this.detectQueryType(query)
      }
    };
  }

  /**
   * Query database with pagination (for Batch Sync)
   * Returns flattened structure: one row per lesson with course/topic/module/lesson data
   */
  async queryDatabase({ tenant_id, limit, offset, since }) {
    let query = `
      SELECT 
        c.id as course_id,
        c.course_name,
        c.course_description,
        c.course_type,
        c.duration_hours,
        c.created_at,
        c.created_by_user_id,
        c.learning_path_designation,
        c.ai_assets,
        r.learner_id,
        r.learner_name,
        t.id as topic_id,
        t.topic_name,
        m.id as module_id,
        m.module_name,
        l.id as lesson_id,
        l.lesson_name,
        l.lesson_description,
        l.skills,
        l.content_data
      FROM lessons l
      INNER JOIN modules m ON l.module_id = m.id
      INNER JOIN topics t ON l.topic_id = t.id AND m.topic_id = t.id
      INNER JOIN courses c ON t.course_id = c.id
      LEFT JOIN registrations r ON c.id = r.course_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Filter by since date if provided (check BOTH created_at AND updated_at)
    if (since) {
      const sinceDate = new Date(since);
      query += ` AND (c.created_at >= $${paramIndex} OR c.updated_at >= $${paramIndex})`;
      params.push(sinceDate);
      paramIndex++;
    }

    query += ' ORDER BY c.created_at DESC, t.id, m.id, l.id';
    query += ` LIMIT $${paramIndex++}`;
    params.push(limit);
    query += ` OFFSET $${paramIndex++}`;
    params.push(offset);

    const rows = await db.any(query, params);
    
    // Convert to JSON format for RAG
    return rows.map(row => {
      // Parse JSONB fields
      const learning_path_designation = typeof row.learning_path_designation === 'string' 
        ? JSON.parse(row.learning_path_designation) 
        : row.learning_path_designation || {};
      
      const ai_assets = typeof row.ai_assets === 'string' 
        ? JSON.parse(row.ai_assets) 
        : row.ai_assets || {};
      
      const skills = typeof row.skills === 'string' 
        ? JSON.parse(row.skills) 
        : (Array.isArray(row.skills) ? row.skills : []);
      
      const content_data = typeof row.content_data === 'string' 
        ? JSON.parse(row.content_data) 
        : (Array.isArray(row.content_data) ? row.content_data : []);

      return {
        course_id: row.course_id,
        course_name: row.course_name,
        course_description: row.course_description,
        course_type: row.course_type,
        duration_hours: row.duration_hours,
        created_at: row.created_at?.toISOString() || null,
        created_by_user_id: row.created_by_user_id,
        learning_path_designation,
        ai_assets,
        learner_id: row.learner_id || null,
        learner_name: row.learner_name || null,
        topic_id: row.topic_id,
        topic_name: row.topic_name,
        module_id: row.module_id,
        module_name: row.module_name,
        lesson_id: row.lesson_id,
        lesson_name: row.lesson_name,
        lesson_description: row.lesson_description,
        skills,
        content_data
      };
    });
  }

  /**
   * Get total count (for Batch Sync pagination)
   * Counts lessons (one row per lesson in the flattened structure)
   */
  async getTotalCount({ tenant_id, since }) {
    let query = `
      SELECT COUNT(*) as count
      FROM lessons l
      INNER JOIN modules m ON l.module_id = m.id
      INNER JOIN topics t ON l.topic_id = t.id AND m.topic_id = t.id
      INNER JOIN courses c ON t.course_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Filter by since date if provided (check BOTH created_at AND updated_at)
    if (since) {
      const sinceDate = new Date(since);
      query += ` AND (c.created_at >= $${paramIndex} OR c.updated_at >= $${paramIndex})`;
      params.push(sinceDate);
      paramIndex++;
    }

    const result = await db.one(query, params);
    return parseInt(result.count, 10);
  }

  /**
   * Get recent items (for Real-time queries)
   * Returns flattened structure: one row per lesson with course/topic/module/lesson data
   */
  async getRecentItems(tenant_id, user_id) {
    const query = `
      SELECT 
        c.id as course_id,
        c.course_name,
        c.course_description,
        c.course_type,
        c.duration_hours,
        c.created_at,
        c.created_by_user_id,
        c.learning_path_designation,
        c.ai_assets,
        r.learner_id,
        r.learner_name,
        t.id as topic_id,
        t.topic_name,
        m.id as module_id,
        m.module_name,
        l.id as lesson_id,
        l.lesson_name,
        l.lesson_description,
        l.skills,
        l.content_data
      FROM lessons l
      INNER JOIN modules m ON l.module_id = m.id
      INNER JOIN topics t ON l.topic_id = t.id AND m.topic_id = t.id
      INNER JOIN courses c ON t.course_id = c.id
      LEFT JOIN registrations r ON c.id = r.course_id
      WHERE c.status = 'active'
      ORDER BY c.created_at DESC, t.id, m.id, l.id
      LIMIT 10
    `;

    const rows = await db.any(query);
    
    return rows.map(row => {
      // Parse JSONB fields
      const learning_path_designation = typeof row.learning_path_designation === 'string' 
        ? JSON.parse(row.learning_path_designation) 
        : row.learning_path_designation || {};
      
      const ai_assets = typeof row.ai_assets === 'string' 
        ? JSON.parse(row.ai_assets) 
        : row.ai_assets || {};
      
      const skills = typeof row.skills === 'string' 
        ? JSON.parse(row.skills) 
        : (Array.isArray(row.skills) ? row.skills : []);
      
      const content_data = typeof row.content_data === 'string' 
        ? JSON.parse(row.content_data) 
        : (Array.isArray(row.content_data) ? row.content_data : []);

      return {
        course_id: row.course_id,
        course_name: row.course_name,
        course_description: row.course_description,
        course_type: row.course_type,
        duration_hours: row.duration_hours,
        created_at: row.created_at?.toISOString() || null,
        created_by_user_id: row.created_by_user_id,
        learning_path_designation,
        ai_assets,
        learner_id: row.learner_id || null,
        learner_name: row.learner_name || null,
        topic_id: row.topic_id,
        topic_name: row.topic_name,
        module_id: row.module_id,
        module_name: row.module_name,
        lesson_id: row.lesson_id,
        lesson_name: row.lesson_name,
        lesson_description: row.lesson_description,
        skills,
        content_data
      };
    });
  }

  /**
   * Get item by ID (for Real-time queries)
   * Returns flattened structure: one row per lesson with course/topic/module/lesson data
   * If ID is a course_id, returns all lessons for that course
   * If ID is a lesson_id, returns that specific lesson
   */
  async getItemById(tenant_id, id) {
    // Try as lesson_id first
    let query = `
      SELECT 
        c.id as course_id,
        c.course_name,
        c.course_description,
        c.course_type,
        c.duration_hours,
        c.created_at,
        c.created_by_user_id,
        c.learning_path_designation,
        c.ai_assets,
        r.learner_id,
        r.learner_name,
        t.id as topic_id,
        t.topic_name,
        m.id as module_id,
        m.module_name,
        l.id as lesson_id,
        l.lesson_name,
        l.lesson_description,
        l.skills,
        l.content_data
      FROM lessons l
      INNER JOIN modules m ON l.module_id = m.id
      INNER JOIN topics t ON l.topic_id = t.id AND m.topic_id = t.id
      INNER JOIN courses c ON t.course_id = c.id
      LEFT JOIN registrations r ON c.id = r.course_id
      WHERE l.id = $1
      LIMIT 1
    `;

    let row = await db.oneOrNone(query, [id]);
    
    // If not found as lesson_id, try as course_id and return first lesson
    if (!row) {
      query = `
        SELECT 
          c.id as course_id,
          c.course_name,
          c.course_description,
          c.course_type,
          c.duration_hours,
          c.created_at,
          c.created_by_user_id,
          c.learning_path_designation,
          c.ai_assets,
          r.learner_id,
          r.learner_name,
          t.id as topic_id,
          t.topic_name,
          m.id as module_id,
          m.module_name,
          l.id as lesson_id,
          l.lesson_name,
          l.lesson_description,
          l.skills,
          l.content_data
        FROM lessons l
        INNER JOIN modules m ON l.module_id = m.id
        INNER JOIN topics t ON l.topic_id = t.id AND m.topic_id = t.id
        INNER JOIN courses c ON t.course_id = c.id
        LEFT JOIN registrations r ON c.id = r.course_id
        WHERE c.id = $1
        ORDER BY t.id, m.id, l.id
        LIMIT 1
      `;
      row = await db.oneOrNone(query, [id]);
    }

    if (!row) {
      return null;
    }

    // Parse JSONB fields
    const learning_path_designation = typeof row.learning_path_designation === 'string' 
      ? JSON.parse(row.learning_path_designation) 
      : row.learning_path_designation || {};
    
    const ai_assets = typeof row.ai_assets === 'string' 
      ? JSON.parse(row.ai_assets) 
      : row.ai_assets || {};
    
    const skills = typeof row.skills === 'string' 
      ? JSON.parse(row.skills) 
      : (Array.isArray(row.skills) ? row.skills : []);
    
    const content_data = typeof row.content_data === 'string' 
      ? JSON.parse(row.content_data) 
      : (Array.isArray(row.content_data) ? row.content_data : []);

    return {
      course_id: row.course_id,
      course_name: row.course_name,
      course_description: row.course_description,
      course_type: row.course_type,
      duration_hours: row.duration_hours,
      created_at: row.created_at?.toISOString() || null,
      created_by_user_id: row.created_by_user_id,
      learning_path_designation,
      ai_assets,
      learner_id: row.learner_id || null,
      learner_name: row.learner_name || null,
      topic_id: row.topic_id,
      topic_name: row.topic_name,
      module_id: row.module_id,
      module_name: row.module_name,
      lesson_id: row.lesson_id,
      lesson_name: row.lesson_name,
      lesson_description: row.lesson_description,
      skills,
      content_data
    };
  }

  /**
   * Get default data (for Real-time queries)
   * Returns flattened structure: one row per lesson with course/topic/module/lesson data
   */
  async getDefaultData(tenant_id, user_id) {
    const query = `
      SELECT 
        c.id as course_id,
        c.course_name,
        c.course_description,
        c.course_type,
        c.duration_hours,
        c.created_at,
        c.created_by_user_id,
        c.learning_path_designation,
        c.ai_assets,
        r.learner_id,
        r.learner_name,
        t.id as topic_id,
        t.topic_name,
        m.id as module_id,
        m.module_name,
        l.id as lesson_id,
        l.lesson_name,
        l.lesson_description,
        l.skills,
        l.content_data
      FROM lessons l
      INNER JOIN modules m ON l.module_id = m.id
      INNER JOIN topics t ON l.topic_id = t.id AND m.topic_id = t.id
      INNER JOIN courses c ON t.course_id = c.id
      LEFT JOIN registrations r ON c.id = r.course_id
      WHERE c.status = 'active'
      ORDER BY c.created_at DESC, t.id, m.id, l.id
      LIMIT 20
    `;

    const rows = await db.any(query);
    
    return rows.map(row => {
      // Parse JSONB fields
      const learning_path_designation = typeof row.learning_path_designation === 'string' 
        ? JSON.parse(row.learning_path_designation) 
        : row.learning_path_designation || {};
      
      const ai_assets = typeof row.ai_assets === 'string' 
        ? JSON.parse(row.ai_assets) 
        : row.ai_assets || {};
      
      const skills = typeof row.skills === 'string' 
        ? JSON.parse(row.skills) 
        : (Array.isArray(row.skills) ? row.skills : []);
      
      const content_data = typeof row.content_data === 'string' 
        ? JSON.parse(row.content_data) 
        : (Array.isArray(row.content_data) ? row.content_data : []);

      return {
        course_id: row.course_id,
        course_name: row.course_name,
        course_description: row.course_description,
        course_type: row.course_type,
        duration_hours: row.duration_hours,
        created_at: row.created_at?.toISOString() || null,
        created_by_user_id: row.created_by_user_id,
        learning_path_designation,
        ai_assets,
        learner_id: row.learner_id || null,
        learner_name: row.learner_name || null,
        topic_id: row.topic_id,
        topic_name: row.topic_name,
        module_id: row.module_id,
        module_name: row.module_name,
        lesson_id: row.lesson_id,
        lesson_name: row.lesson_name,
        lesson_description: row.lesson_description,
        skills,
        content_data
      };
    });
  }

  /**
   * Extract ID from query text
   */
  extractId(query) {
    // Try UUID pattern first
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = query.match(uuidPattern);
    if (uuidMatch) {
      return uuidMatch[0];
    }

    // Try numeric ID
    const numericMatch = query.match(/\d+/);
    return numericMatch ? numericMatch[0] : null;
  }

  /**
   * Detect query type
   */
  detectQueryType(query) {
    if (query.includes('recent') || query.includes('latest')) return 'recent';
    if (query.includes('id') || query.includes('show') || query.includes('course')) return 'by_id';
    return 'default';
  }
}

export default new ProcessHandler();

