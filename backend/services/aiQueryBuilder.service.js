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

Tables:
- courses: id, title, course_name, description, level, rating, status, course_type, created_by_user_id, metadata, created_at, updated_at
- topics: id, course_id, title, order_index
- modules: id, course_id, topic_id, title, order_index
- lessons: id, course_id, module_id, title, content, order_index, status
- feedback: id, learner_id, course_id, rating, comment, submitted_at
- enrollments: learner_id, course_id, enrolled_at, progress, status

Relationships:
- topics.course_id -> courses.id
- modules.course_id -> courses.id, modules.topic_id -> topics.id
- lessons.course_id -> courses.id, lessons.module_id -> modules.id
- feedback.course_id -> courses.id, feedback.learner_id -> learners.id
- enrollments.course_id -> courses.id, enrollments.learner_id -> learners.id

Common aggregations:
- COUNT(lessons.id) for total lessons
- AVG(feedback.rating) for average rating
- COUNT(enrollments.learner_id) for total enrollments
- SUM(CASE WHEN lessons.status = 'completed' THEN 1 ELSE 0 END) for completed lessons
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
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured. Cannot generate SQL queries.');
  }

  // Safety check: Ensure response template has fields to fill
  // Per requirements: "If the response_template is empty: Output nothing (AI should not be invoked)"
  if (!responseTemplateHasFields(responseTemplate)) {
    throw new Error('Response template is empty. AI should not be invoked when there are no fields to fill.');
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build the prompt
    const prompt = buildQueryGenerationPrompt(payloadObject, responseTemplate);

    // Generate SQL query
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract SQL from response (may contain markdown code fences)
    const sqlQuery = extractSQLFromResponse(text);

    // Validate the query is SELECT only
    validateQueryIsSelectOnly(sqlQuery);

    return sqlQuery.trim();
  } catch (error) {
    console.error('[AI Query Builder] Error generating SQL query:', error);
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

You receive:
1. payload: JSON object with parameters, identifiers, or filters
2. response_template: JSON object with the exact fields that must be filled

Your job:
- Generate a single SQL SELECT query that retrieves exactly the fields needed to fill the response_template.
- Use only the fields provided in the payload + the Course Builder DB schema.
- Do not invent fields or tables.
- Only SELECT queries are allowed.
- No INSERT/UPDATE/DELETE/TRUNCATE/ALTER/CREATE.
- Output ONLY raw SQL. No Markdown. No explanations.

Database Schema:
${DB_SCHEMA_CONTEXT}

Payload:
${payloadStr}

Response Template (fields that must be filled):
${templateStr}

Generate a SQL SELECT query that:
- Uses fields from the payload to filter/join data (use parameter placeholders $1, $2, etc.)
- Returns columns that match the field names in the response template
- Use column aliases (AS) to match template field names if needed
- Only uses SELECT statements (no INSERT, UPDATE, DELETE, TRUNCATE, ALTER, CREATE)
- Uses PostgreSQL syntax
- Returns exactly the fields needed to fill the response template
- Parameter placeholders ($1, $2, etc.) for any values that come from the payload
- Do NOT hard-code values - always use placeholders

IMPORTANT: Output ONLY raw SQL. No Markdown code fences. No explanations. Just the SQL query.

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
