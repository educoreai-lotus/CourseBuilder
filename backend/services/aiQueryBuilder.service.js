/**
 * AI Query Builder Service
 * Uses AI (OpenAI) to generate SQL SELECT queries based on payload and response template
 * 
 * IMPORTANT: This service does NOT make assumptions about payload/response structure.
 * It extracts meaning from the ACTUAL runtime request.
 */

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Database schema information for AI context
const DB_SCHEMA_CONTEXT = `
Course Builder Database Schema (PostgreSQL):

REAL TABLES (use ONLY these - never invent table names):
- courses: id (UUID), course_name (TEXT), course_description (TEXT), course_type (ENUM: 'learner_specific', 'trainer'), status (ENUM: 'active', 'archived', 'draft'), level (ENUM: 'beginner', 'intermediate', 'advanced'), duration_hours (INT), created_by_user_id (UUID), created_at (TIMESTAMP), updated_at (TIMESTAMP)
- topics: id (UUID), course_id (UUID), topic_name (TEXT), topic_description (TEXT)
- modules: id (UUID), topic_id (UUID), module_name (TEXT), module_description (TEXT)
- lessons: id (UUID), module_id (UUID), topic_id (UUID), lesson_name (TEXT), lesson_description (TEXT), skills (JSONB), trainer_ids (UUID[]), content_type (TEXT), content_data (JSONB), devlab_exercises (JSONB)
- feedback: id (UUID), learner_id (UUID), course_id (UUID), rating (INT 1-5), comment (TEXT), submitted_at (TIMESTAMP)
- registrations: id (UUID), learner_id (UUID), learner_name (TEXT), course_id (UUID), company_id (UUID), company_name (TEXT), status (ENUM: 'completed', 'in_progress', 'failed'), enrolled_date (TIMESTAMP), completed_date (TIMESTAMP)
- assessments: id (UUID), learner_id (UUID), learner_name (TEXT), course_id (UUID), exam_type (ENUM: 'postcourse'), passing_grade (NUMERIC), final_grade (NUMERIC), passed (BOOLEAN)

REAL RELATIONSHIPS (use ONLY these):
- topics.course_id -> courses.id (ON DELETE CASCADE)
- modules.topic_id -> topics.id (ON DELETE CASCADE)
- lessons.module_id -> modules.id (ON DELETE CASCADE)
- lessons.topic_id -> topics.id (ON DELETE CASCADE)
- feedback.course_id -> courses.id (ON DELETE CASCADE)
- feedback.learner_id -> learner UUID (NOT a table - just UUID)
- registrations.course_id -> courses.id (ON DELETE CASCADE)
- registrations.learner_id -> learner UUID (NOT a table - just UUID)
- assessments.course_id -> courses.id (ON DELETE CASCADE)
- assessments.learner_id -> learner UUID (NOT a table - just UUID)

FIELD NAME NORMALIZATION RULES (CRITICAL):
When requester uses different field names, you MUST map them to real Course Builder schema:

Learner Identifiers:
- user_id, student_id, employee_id, user_uuid → learner_id (UUID field in feedback/registrations/assessments tables)

Enrollment/Registration:
- enrolled, enrollment_count, total_enrollments → COUNT(registrations.learner_id) WHERE course_id = $1
- active_enrollments → COUNT(registrations.learner_id) WHERE course_id = $1 AND status = 'in_progress'
- completed_enrollments → COUNT(registrations.learner_id) WHERE course_id = $1 AND status = 'completed'

Instructor/Trainer:
- instructor, teacher, instructor_id, trainer_uuid → created_by_user_id (in courses table) OR trainer_ids (in lessons table - array)

Ratings/Scores:
- rating, score, average_rating → AVG(feedback.rating) WHERE course_id = $1
- rating_value → feedback.rating

Lesson Counts:
- lessons_count, total_lessons, lesson_total → COUNT(lessons.id) WHERE course_id = $1 (join through topics/modules)
- completed_lessons → Use registrations table or lesson_completion_dictionary in courses table

Course Information:
- course_title, title → course_name (in courses table)
- course_desc, description → course_description (in courses table)

IMPORTANT MAPPING EXAMPLES:
- payload: { "user_id": "123" } → WHERE learner_id = $1 (NOT user_id - learner_id is the real column)
- response: { "enrolled": 0 } → SELECT COUNT(registrations.learner_id) AS enrolled ...
- response: { "instructor": "uuid" } → SELECT created_by_user_id AS instructor ...
- response: { "lessons_count": 0 } → SELECT COUNT(lessons.id) AS lessons_count ... (join through modules/topics)

NEVER USE THESE (they don't exist):
- ❌ learners table (learner_id is just a UUID, not a foreign key to a table)
- ❌ enrollments table (use registrations table instead)
- ❌ users table (use learner_id directly)
- ❌ trainers table (use created_by_user_id or trainer_ids array)
`;

/**
 * Check if response template has fields to fill
 * @param {Object} responseTemplate - Response template to check
 * @returns {boolean} - True if template has fields
 */
function responseTemplateHasFields(responseTemplate) {
  if (!responseTemplate || typeof responseTemplate !== 'object') {
    return false;
  }
  
  const keys = Object.keys(responseTemplate);
  if (keys.length === 0) {
    return false;
  }
  
  // Check if any value is not null/undefined (indicating a field to fill)
  for (const key of keys) {
    const value = responseTemplate[key];
    if (value !== null && value !== undefined) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate SQL query using AI based on payload and response template
 * Supports both Data-Filling mode (SELECT) and Action/Command mode (INSERT/UPDATE/DELETE/SELECT)
 * @param {Object} payloadObject - Parsed payload from request
 * @param {Object} responseTemplate - Parsed response template showing what fields need to be filled
 * @param {string|null} action - Action from payload (optional)
 * @param {boolean} isActionMode - True if Action/Command mode, false if Data-Filling mode
 * @returns {Promise<string>} - Generated SQL query
 * @throws {Error} - If response template is invalid
 */
export async function generateSQLQuery(payloadObject, responseTemplate, action = null, isActionMode = false) {
  console.log('[AI Query Builder] Starting SQL query generation...');
  console.log('[AI Query Builder] Mode:', isActionMode ? 'Action/Command' : 'Data-Filling');
  
  if (!OPENAI_API_KEY) {
    console.error('[AI Query Builder] ❌ ERROR: OPENAI_API_KEY not configured in environment variables');
    console.error('[AI Query Builder] Please set OPENAI_API_KEY in Railway environment variables');
    throw new Error('OPENAI_API_KEY not configured. Cannot generate SQL queries.');
  }
  console.log('[AI Query Builder] ✅ OPENAI_API_KEY found in environment');

  try {
    console.log('[AI Query Builder] Initializing OpenAI...');
    const client = new OpenAI({ apiKey: OPENAI_API_KEY });
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    console.log(`[AI Query Builder] ✅ OpenAI initialized with model: ${modelName}`);

    // Build the prompt
    console.log('[AI Query Builder] Building prompt with field normalization rules...');
    const prompt = buildQueryGenerationPrompt(payloadObject, responseTemplate, action, isActionMode);
    console.log('[AI Query Builder] ✅ Prompt built successfully');

    // System message depends on mode
    const systemMessage = isActionMode
      ? 'You are an expert SQL query generator for PostgreSQL. Generate valid SQL queries including INSERT, UPDATE, DELETE, or SELECT validation queries. For Action mode, you may write to the database or validate state.'
      : 'You are an expert SQL query generator for PostgreSQL. Generate only valid SELECT queries for reading data. Never use INSERT, UPDATE, DELETE, or any other non-SELECT statements.';

    // Generate SQL query using OpenAI
    console.log('[AI Query Builder] 🚀 Calling OpenAI to generate SQL query...');
    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for more deterministic SQL generation
      max_tokens: 1000
    });
    
    const text = completion.choices[0]?.message?.content || '';
    const duration = Date.now() - startTime;
    console.log(`[AI Query Builder] ✅ OpenAI responded in ${duration}ms`);
    console.log('[AI Query Builder] Raw AI response length:', text.length, 'characters');

    if (!text) {
      throw new Error('OpenAI returned empty response');
    }

    // Extract SQL from response (may contain markdown code fences)
    console.log('[AI Query Builder] Extracting SQL from AI response...');
    const sqlQuery = extractSQLFromResponse(text, isActionMode);
    console.log('[AI Query Builder] ✅ SQL extracted:', sqlQuery.substring(0, 100) + '...');

    // Validate the query based on mode
    console.log('[AI Query Builder] Validating SQL query...');
    validateQuery(sqlQuery, isActionMode);
    console.log('[AI Query Builder] ✅ SQL query validated successfully');

    const finalQuery = sqlQuery.trim();
    console.log('[AI Query Builder] ✅ Final SQL query generated:', finalQuery);
    return finalQuery;
  } catch (error) {
    console.error('[AI Query Builder] ❌ Error generating SQL query:', error.message);
    console.error('[AI Query Builder] Error stack:', error.stack);
    throw new Error(`Failed to generate SQL query: ${error.message}`);
  }
}

/**
 * Build prompt for AI to generate SQL query
 * Supports both Data-Filling and Action/Command modes
 */
function buildQueryGenerationPrompt(payloadObject, responseTemplate, action = null, isActionMode = false) {
  const payloadStr = JSON.stringify(payloadObject, null, 2);
  const templateStr = JSON.stringify(responseTemplate, null, 2);
  const actionStr = action ? `\nAction: ${action}` : '';

  const modeInstructions = isActionMode
    ? `ACTION/COMMAND MODE:
- You may generate INSERT, UPDATE, DELETE, or SELECT validation queries
- Perform the operation requested by the action
- If response_template contains "answer", your SQL MUST return one row with a column named "answer"
- For empty response_template {}, perform the operation and return no data (or return "OK" as answer if needed)
- For enrollment/registration operations (enroll_employees_career_path, enroll_employees_career_path):
  * Payload structure: { learners: [{ learner_id, learner_name, preferred_language, course_id }], company_id, company_name, learning_flow }
  * For CAREER_PATH_DRIVEN enrollment:
    - course_id is ALWAYS provided in the payload (created via course creation pipeline before SQL generation)
    - Use learners[].course_id for each learner's enrollment
    - course_id is guaranteed to exist - never null/missing
  * For batch enrollments, generate INSERT statements for each learner in the learners array
  * Use VALUES clause with multiple rows OR loop through learners array
  * INSERT INTO registrations (learner_id, learner_name, course_id, company_id, company_name, status) VALUES 
    ($1, $2, $3, $4, $5, 'in_progress'), ($6, $7, $8, $9, $10, 'in_progress'), ...
  * Use payload.company_id and payload.company_name (top-level) for all learners
  * For empty response_template {}, perform the operation and return empty result or 'OK' as answer
  * For structured response_template with success/message/enrollment_batch_id:
    - Return success=true if all enrollments succeed
    - Return enrollment_batch_id (can be a generated UUID or first registration id)
    - Return failed_employee_ids as empty array if all succeed, or array of learner_ids that failed
- Examples:
  * INSERT INTO registrations (learner_id, course_id) VALUES ($1, $2) RETURNING 'OK' AS answer
  * UPDATE assessments SET passed = true WHERE learner_id = $1 AND course_id = $2 RETURNING CASE WHEN passed THEN 'OK' ELSE 'FAILED' END AS answer
  * SELECT CASE WHEN passed = true THEN 'OK' ELSE 'FAILED' END AS answer FROM assessments WHERE learner_id = $1 AND course_id = $2`
    : `DATA-FILLING MODE (CRITICAL - READ CAREFULLY):
- ⚠️ YOU MUST GENERATE ONLY SELECT QUERIES
- ⚠️ UPDATE STATEMENTS ARE FORBIDDEN AND WILL CAUSE SECURITY ERRORS
- ⚠️ INSERT STATEMENTS ARE FORBIDDEN AND WILL CAUSE SECURITY ERRORS
- ⚠️ DELETE STATEMENTS ARE FORBIDDEN AND WILL CAUSE SECURITY ERRORS
- ⚠️ ANY WRITE OPERATION WILL BE REJECTED BY THE SYSTEM
- Return exactly the columns required by response_template
- Use column aliases (AS) to match response template field names
- Use SELECT with JOINs, aggregations, and CASE expressions to derive data
- If you need to compute values, use SELECT with expressions, NOT UPDATE
- Example: SELECT COUNT(*) AS total_courses FROM courses (NOT UPDATE courses SET...)`;

  return `You are a "Response-Driven SQL Generator" for the Course Builder microservice.

You are NOT a chat assistant.
You are NOT allowed to explain, describe, or suggest.

Your responsibility is to generate a SINGLE SQL query that,
when executed, COMPLETELY FILLS the given response template.

============================================================
RESPONSE CONTRACT (CRITICAL)
============================================================

• The response template is a STRICT CONTRACT.
• EVERY field in the response template MUST be returned by the SQL query.
• If ANY response field cannot be resolved correctly → FAIL.
• Do NOT guess.
• Do NOT return NULL unless the field is logically nullable.

You are responsible for the correctness of the RESULT, not only the SQL.

============================================================
RESPONSE-FIRST LOGIC
============================================================

• You MUST start from the response template.
• The payload is used ONLY for filters and parameters.
• The SELECT list MUST mirror the response template exactly
  using column aliases (AS).

============================================================
DERIVED & MISSING FIELDS
============================================================

If a response field does NOT exist directly in the database:
• You MUST derive it using:
  - JOINs
  - COUNT / AVG / SUM
  - CASE expressions
  - Boolean or arithmetic logic

Examples:
• total_lessons → COUNT(lessons.id)
• completed_lessons → COUNT(...) with filters
• progress_percentage → (completed_lessons / total_lessons) * 100
• passed → CASE WHEN final_grade >= passing_grade THEN true ELSE false END

============================================================
MODE (CRITICAL - READ THIS FIRST)
============================================================

MODE: ${isActionMode ? 'ACTION/COMMAND' : 'DATA-FILLING'}

${isActionMode ? '' : '🚨 SECURITY WARNING: You are in DATA-FILLING mode. Any UPDATE, INSERT, or DELETE statement will be REJECTED and cause the request to FAIL. You MUST use SELECT only. 🚨'}

${modeInstructions}

============================================================
CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY
============================================================

1. USE ONLY REAL COURSE BUILDER TABLES AND COLUMNS
   - NEVER invent table names or column names
   - If a field does not exist → derive it logically
   - Always use the provided Course Builder schema

2. FIELD NAME NORMALIZATION (MANDATORY)
   - DO NOT use requester field names literally
   - Map requester fields to real schema fields
   - Examples:
     * user_id → learner_id
     * enrolled → COUNT(registrations.learner_id)
     * instructor → created_by_user_id
     * lessons_count → COUNT(lessons.id)

3. OUTPUT FORMAT
   - ONLY raw SQL
   - No markdown
   - No comments
   - No explanations
   - Use column aliases to match response field names EXACTLY
   - Use parameter placeholders ($1, $2, …)

============================================================
DATABASE SCHEMA (SOURCE OF TRUTH)
============================================================

${DB_SCHEMA_CONTEXT}
${actionStr}

============================================================
PAYLOAD (FILTERS & CONTEXT ONLY)
============================================================

${payloadStr}

============================================================
RESPONSE TEMPLATE (FIELDS THAT MUST BE FILLED)
============================================================

${templateStr}

============================================================
FINAL REQUIREMENTS
============================================================

• Generate exactly ONE SQL query
• Return exactly ONE row
• Fill ALL response fields
• No missing fields
• No silent NULLs

SQL Query:`;
}

/**
 * Extract SQL query from AI response (removes markdown code fences if present)
 * Supports SELECT, INSERT, UPDATE, DELETE queries
 */
function extractSQLFromResponse(text, isActionMode = false) {
  if (!text || typeof text !== 'string') {
    throw new Error('AI response is empty or invalid');
  }

  // Remove markdown code fences
  let cleaned = text
    .replace(/^```sql\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  // Find the SQL query (look for common SQL keywords)
  const upperCleaned = cleaned.toUpperCase();
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  let sqlStartIndex = -1;
  let sqlKeyword = null;
  
  for (const keyword of sqlKeywords) {
    const index = upperCleaned.indexOf(keyword);
    if (index !== -1 && (sqlStartIndex === -1 || index < sqlStartIndex)) {
      sqlStartIndex = index;
      sqlKeyword = keyword;
    }
  }
  
  if (sqlStartIndex === -1) {
    throw new Error('No SQL statement found in AI response');
  }

  // Extract from SQL keyword to the end
  let sql = cleaned.substring(sqlStartIndex);

  // Remove trailing semicolon if present
  sql = sql.replace(/;?\s*$/, '').trim();

  return sql;
}

/**
 * Validate SQL query based on mode
 * @param {string} sqlQuery - SQL query to validate
 * @param {boolean} isActionMode - True if Action mode (allows INSERT/UPDATE/DELETE)
 */
function validateQuery(sqlQuery, isActionMode = false) {
  if (!sqlQuery || typeof sqlQuery !== 'string') {
    throw new Error('Invalid SQL query: query is empty');
  }

  const upperQuery = sqlQuery.toUpperCase().trim();

  // Always forbidden keywords (regardless of mode)
  const alwaysForbidden = ['DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE', 'GRANT', 'REVOKE'];
  
  for (const keyword of alwaysForbidden) {
    // Use word boundaries to avoid false positives (e.g., "created_at" should not match "CREATE")
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sqlQuery)) {
      throw new Error(`Security violation: Query contains forbidden keyword: ${keyword}`);
    }
  }

  // Check for semicolons that might allow multiple statements
  const semicolonCount = (sqlQuery.match(/;/g) || []).length;
  if (semicolonCount > 1) {
    throw new Error('Security violation: Query appears to contain multiple statements');
  }

  // Mode-specific validation
  if (isActionMode) {
    // Action mode: Allow INSERT, UPDATE, DELETE, SELECT
    const allowedKeywords = ['INSERT', 'UPDATE', 'DELETE', 'SELECT'];
    const startsWithAllowed = allowedKeywords.some(keyword => upperQuery.startsWith(keyword));
    
    if (!startsWithAllowed) {
      throw new Error(`Security violation: Action mode query must start with one of: ${allowedKeywords.join(', ')}`);
    }
  } else {
    // Data mode: Only SELECT allowed
    if (!upperQuery.startsWith('SELECT')) {
      throw new Error('Security violation: Data-Filling mode query must be a SELECT statement');
    }
    
    // Check for write operations in data mode
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE'];
    for (const keyword of writeKeywords) {
      if (upperQuery.includes(keyword)) {
        throw new Error(`Security violation: Data-Filling mode cannot use ${keyword} statements`);
      }
    }
  }
}

export default {
  generateSQLQuery
};
