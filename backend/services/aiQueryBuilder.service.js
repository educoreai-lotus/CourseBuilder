/**
 * AI Query Builder Service
 * Uses AI (Gemini) to generate SQL SELECT queries based on payload and response template
 * 
 * IMPORTANT: This service does NOT make assumptions about payload/response structure.
 * It extracts meaning from the ACTUAL runtime request.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not found. AI query generation will fail.');
}

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
 * @param {Object} payloadObject - Parsed payload from request
 * @param {Object} responseTemplate - Parsed response template showing what fields need to be filled
 * @returns {Promise<string>} - Generated SQL SELECT query
 * @throws {Error} - If response template is empty or invalid
 */
export async function generateSQLQuery(payloadObject, responseTemplate) {
  console.log('[AI Query Builder] Starting SQL query generation...');
  
  if (!GEMINI_API_KEY) {
    console.error('[AI Query Builder] ❌ ERROR: GEMINI_API_KEY not configured in environment variables');
    console.error('[AI Query Builder] Please set GEMINI_API_KEY in Railway environment variables');
    throw new Error('GEMINI_API_KEY not configured. Cannot generate SQL queries.');
  }
  console.log('[AI Query Builder] ✅ GEMINI_API_KEY found in environment');

  // Safety check: Ensure response template has fields to fill
  // Per requirements: "If the response_template is empty: Output nothing (AI should not be invoked)"
  if (!responseTemplateHasFields(responseTemplate)) {
    console.warn('[AI Query Builder] ⚠️ Response template is empty - AI should not be invoked');
    throw new Error('Response template is empty. AI should not be invoked when there are no fields to fill.');
  }
  console.log('[AI Query Builder] ✅ Response template has fields to fill');

  try {
    console.log('[AI Query Builder] Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('[AI Query Builder] ✅ Gemini AI initialized with model: gemini-2.5-flash');

    // Build the prompt
    console.log('[AI Query Builder] Building prompt with field normalization rules...');
    const prompt = buildQueryGenerationPrompt(payloadObject, responseTemplate);
    console.log('[AI Query Builder] ✅ Prompt built successfully');

    // Generate SQL query using Gemini AI
    console.log('[AI Query Builder] 🚀 Calling Gemini AI to generate SQL query...');
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const duration = Date.now() - startTime;
    console.log(`[AI Query Builder] ✅ Gemini AI responded in ${duration}ms`);
    console.log('[AI Query Builder] Raw AI response length:', text.length, 'characters');

    // Extract SQL from response (may contain markdown code fences)
    console.log('[AI Query Builder] Extracting SQL from AI response...');
    const sqlQuery = extractSQLFromResponse(text);
    console.log('[AI Query Builder] ✅ SQL extracted:', sqlQuery.substring(0, 100) + '...');

    // Validate the query is SELECT only
    console.log('[AI Query Builder] Validating SQL query (SELECT-only check)...');
    validateQueryIsSelectOnly(sqlQuery);
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
 * Uses exact system prompt as specified in requirements
 */
function buildQueryGenerationPrompt(payloadObject, responseTemplate) {
  const payloadStr = JSON.stringify(payloadObject, null, 2);
  const templateStr = JSON.stringify(responseTemplate, null, 2);

  return `You are the "Course Builder SQL Generator" — an expert system that produces safe SQL SELECT queries for the Course Builder microservice.

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:

1. USE ONLY REAL COURSE BUILDER TABLES AND COLUMNS
   - NEVER invent table names or column names
   - If a table/field doesn't exist → map to the closest real field based on context
   - Always use the actual Course Builder schema (provided below)

2. FIELD NAME NORMALIZATION (MANDATORY)
   - DO NOT use requester field names literally
   - INTERPRET requester fields and map them to real Course Builder schema
   - Examples:
     * requester says "user_id" → use "learner_id" (real column name)
     * requester says "enrolled" → use COUNT(registrations.learner_id)
     * requester says "instructor" → use "created_by_user_id" (in courses table)
     * requester says "rating" → use "rating" (in feedback table)
     * requester says "lessons_count" → use COUNT(lessons.id)

3. IF REQUESTER USES DIFFERENT FIELD NAMES:
   - Normalize them using the mapping rules below
   - NEVER create invalid SQL with unknown tables/columns
   - Choose the nearest correct Course Builder table/field

4. ALWAYS GENERATE VALID SQL
   - Use ONLY tables that exist in the schema
   - Use ONLY columns that exist in those tables
   - If uncertain, default to the most logical Course Builder table

5. OUTPUT FORMAT
   - ONLY raw SQL SELECT query
   - No Markdown code fences
   - No explanations or comments
   - Use column aliases (AS) to match response template field names
   - Use parameter placeholders ($1, $2, etc.) for payload values

Database Schema:
${DB_SCHEMA_CONTEXT}

Payload (requester fields - normalize to real schema):
${payloadStr}

Response Template (fields that must be filled - use aliases to match these names):
${templateStr}

FIELD NORMALIZATION EXAMPLES:
- payload.user_id → WHERE learner_id = $1 (NOT user_id)
- response.enrolled → SELECT COUNT(registrations.learner_id) AS enrolled ...
- response.instructor → SELECT created_by_user_id AS instructor ...
- response.lessons_count → SELECT COUNT(lessons.id) AS lessons_count ... (join properly)
- payload.course_id → WHERE course_id = $1 (real column name - use as-is)

JOIN REQUIREMENTS:
- To get lessons for a course: JOIN topics ON topics.course_id = courses.id JOIN modules ON modules.topic_id = topics.id JOIN lessons ON lessons.module_id = modules.id
- To get registrations: JOIN registrations ON registrations.course_id = courses.id
- To get feedback: JOIN feedback ON feedback.course_id = courses.id

Generate SQL SELECT query that:
1. Normalizes all requester field names to real Course Builder schema
2. Uses proper JOINs to connect tables through foreign keys
3. Uses parameter placeholders ($1, $2, etc.) for payload values
4. Uses column aliases (AS) to match response template field names
5. Uses ONLY SELECT statements (no INSERT/UPDATE/DELETE/TRUNCATE/ALTER/CREATE)
6. Uses PostgreSQL syntax
7. Returns exactly the fields needed to fill the response template

CRITICAL: Normalize field names from payload/response template to real Course Builder schema. Never use unknown tables or columns.

SQL Query:`;
}

/**
 * Extract SQL query from AI response (removes markdown code fences if present)
 */
function extractSQLFromResponse(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('AI response is empty or invalid');
  }

  // Remove markdown code fences
  let cleaned = text
    .replace(/^```sql\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  // Find the SQL query (between first SELECT and last semicolon or end of string)
  const selectIndex = cleaned.toUpperCase().indexOf('SELECT');
  if (selectIndex === -1) {
    throw new Error('No SELECT statement found in AI response');
  }

  // Extract from SELECT to the end
  let sql = cleaned.substring(selectIndex);

  // Remove trailing semicolon if present
  sql = sql.replace(/;?\s*$/, '').trim();

  return sql;
}

/**
 * Validate that the query is SELECT only (security check)
 */
function validateQueryIsSelectOnly(sqlQuery) {
  if (!sqlQuery || typeof sqlQuery !== 'string') {
    throw new Error('Invalid SQL query: query is empty');
  }

  const upperQuery = sqlQuery.toUpperCase().trim();

  // Check for dangerous keywords
  const dangerousKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE'];
  
  for (const keyword of dangerousKeywords) {
    if (upperQuery.includes(keyword)) {
      throw new Error(`Security violation: Query contains forbidden keyword: ${keyword}`);
    }
  }

  // Must start with SELECT
  if (!upperQuery.startsWith('SELECT')) {
    throw new Error('Security violation: Query must be a SELECT statement');
  }

  // Check for semicolons that might allow multiple statements
  const semicolonCount = (sqlQuery.match(/;/g) || []).length;
  if (semicolonCount > 1) {
    throw new Error('Security violation: Query appears to contain multiple statements');
  }
}

export default {
  generateSQLQuery
};
