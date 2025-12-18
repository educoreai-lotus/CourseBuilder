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
   */
  async queryDatabase({ tenant_id, limit, offset, since }) {
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Filter by tenant_id if provided (using created_by_user_id or company matching)
    // Note: Course Builder doesn't have explicit tenant_id, so we'll return all courses
    // In production, you might filter by company_id or similar

    // Filter by since date if provided
    if (since) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(new Date(since));
    }

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT $${paramIndex++}`;
    params.push(limit);
    query += ` OFFSET $${paramIndex++}`;
    params.push(offset);

    const rows = await db.any(query, params);
    
    // Convert to JSON format for RAG
    return rows.map(row => {
      // Parse JSONB fields
      const course = {
        course_id: row.id,
        course_name: row.course_name,
        course_description: row.course_description,
        course_type: row.course_type,
        status: row.status,
        level: row.level,
        duration_hours: row.duration_hours,
        start_date: row.start_date?.toISOString() || null,
        created_at: row.created_at?.toISOString() || null,
        updated_at: row.updated_at?.toISOString() || null,
        created_by_user_id: row.created_by_user_id,
        learning_path_designation: typeof row.learning_path_designation === 'string' 
          ? JSON.parse(row.learning_path_designation) 
          : row.learning_path_designation || {},
        ai_assets: typeof row.ai_assets === 'string' 
          ? JSON.parse(row.ai_assets) 
          : row.ai_assets || {}
      };
      return course;
    });
  }

  /**
   * Get total count (for Batch Sync pagination)
   */
  async getTotalCount({ tenant_id, since }) {
    let query = 'SELECT COUNT(*) as count FROM courses WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (since) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(new Date(since));
    }

    const result = await db.one(query, params);
    return parseInt(result.count, 10);
  }

  /**
   * Get recent items (for Real-time queries)
   */
  async getRecentItems(tenant_id, user_id) {
    const courses = await courseRepository.findAll({
      limit: 10,
      status: 'active'
    });

    return courses.map(course => course.toJSON()).map(course => ({
      course_id: course.id,
      course_name: course.course_name,
      course_description: course.course_description,
      course_type: course.course_type,
      status: course.status,
      level: course.level,
      duration_hours: course.duration_hours,
      start_date: course.start_date,
      created_at: course.created_at,
      updated_at: course.updated_at,
      created_by_user_id: course.created_by_user_id,
      learning_path_designation: course.learning_path_designation,
      ai_assets: course.ai_assets
    }));
  }

  /**
   * Get item by ID (for Real-time queries)
   */
  async getItemById(tenant_id, id) {
    const course = await courseRepository.findById(id);
    if (!course) {
      return null;
    }

    const courseJson = course.toJSON();
    return {
      course_id: courseJson.id,
      course_name: courseJson.course_name,
      course_description: courseJson.course_description,
      course_type: courseJson.course_type,
      status: courseJson.status,
      level: courseJson.level,
      duration_hours: courseJson.duration_hours,
      start_date: courseJson.start_date,
      created_at: courseJson.created_at,
      updated_at: courseJson.updated_at,
      created_by_user_id: courseJson.created_by_user_id,
      learning_path_designation: courseJson.learning_path_designation,
      ai_assets: courseJson.ai_assets
    };
  }

  /**
   * Get default data (for Real-time queries)
   */
  async getDefaultData(tenant_id, user_id) {
    const courses = await courseRepository.findAll({
      limit: 20,
      status: 'active'
    });

    return courses.map(course => course.toJSON()).map(course => ({
      course_id: course.id,
      course_name: course.course_name,
      course_description: course.course_description,
      course_type: course.course_type,
      status: course.status,
      level: course.level,
      duration_hours: course.duration_hours,
      start_date: course.start_date,
      created_at: course.created_at,
      updated_at: course.updated_at,
      created_by_user_id: course.created_by_user_id,
      learning_path_designation: course.learning_path_designation,
      ai_assets: course.ai_assets
    }));
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

