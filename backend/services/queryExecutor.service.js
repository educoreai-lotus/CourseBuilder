/**
 * Query Executor Service
 * Safely executes SQL SELECT queries and returns results
 * 
 * Security features:
 * - Only allows SELECT queries
 * - Parameterized queries to prevent SQL injection
 * - Validates query structure
 */

import db from '../config/database.js';

/**
 * Execute a SQL SELECT query safely
 * @param {string} sqlQuery - SQL SELECT query (may contain parameter placeholders $1, $2, etc.)
 * @param {Array} params - Parameters for the query (values for $1, $2, etc.)
 * @returns {Promise<Object|Array>} - Query results (single object for one(), array for many())
 */
export async function executeQuery(sqlQuery, params = []) {
  if (!sqlQuery || typeof sqlQuery !== 'string') {
    throw new Error('Invalid query: SQL query must be a non-empty string');
  }

  // Final security check (in addition to AI builder validation)
  validateQuerySecurity(sqlQuery);

  try {
    // Use parameterized queries to prevent SQL injection
    // db.one() returns a single row, db.many() returns multiple rows
    // db.oneOrNone() returns a single row or null
    
    // Determine which method to use based on expected result
    // For now, try oneOrNone to handle both single and no results gracefully
    const result = await db.oneOrNone(sqlQuery, params);
    
    return result || {}; // Return empty object if no results
  } catch (error) {
    // Handle specific PostgreSQL errors
    if (error.code === 'PGRST116') {
      // No rows returned - return empty object
      return {};
    }
    
    console.error('[Query Executor] Error executing query:', error);
    console.error('[Query Executor] Query:', sqlQuery);
    console.error('[Query Executor] Params:', params);
    
    throw new Error(`Query execution failed: ${error.message}`);
  }
}

/**
 * Execute a query that returns multiple rows
 * @param {string} sqlQuery - SQL SELECT query
 * @param {Array} params - Parameters for the query
 * @returns {Promise<Array>} - Array of result objects
 */
export async function executeQueryMany(sqlQuery, params = []) {
  if (!sqlQuery || typeof sqlQuery !== 'string') {
    throw new Error('Invalid query: SQL query must be a non-empty string');
  }

  // Final security check
  validateQuerySecurity(sqlQuery);

  try {
    const results = await db.manyOrNone(sqlQuery, params);
    return results || []; // Return empty array if no results
  } catch (error) {
    console.error('[Query Executor] Error executing query (many):', error);
    console.error('[Query Executor] Query:', sqlQuery);
    console.error('[Query Executor] Params:', params);
    
    throw new Error(`Query execution failed: ${error.message}`);
  }
}

/**
 * Extract parameters from payload object for use in SQL queries
 * The AI should generate queries with parameter placeholders ($1, $2, etc.)
 * that correspond to values in the payload.
 * 
 * This function tries to intelligently map payload values to query parameters
 * by analyzing both the query and the payload structure.
 * 
 * @param {Object} payloadObject - Parsed payload from request
 * @param {string} sqlQuery - SQL query with parameter placeholders
 * @returns {Array} - Array of parameter values in order ($1, $2, etc.)
 */
export function extractQueryParams(payloadObject, sqlQuery) {
  if (!payloadObject || typeof payloadObject !== 'object') {
    return [];
  }

  // Count parameter placeholders in query ($1, $2, etc.)
  const paramMatches = sqlQuery.match(/\$(\d+)/g) || [];
  if (paramMatches.length === 0) {
    // No parameters needed
    return [];
  }

  // Extract unique parameter numbers
  const paramNumbers = [...new Set(paramMatches.map(m => parseInt(m.substring(1), 10)))].sort();
  const maxParam = Math.max(...paramNumbers);

  // Build list of common field mappings (try both snake_case and camelCase)
  const fieldValues = {};
  
  // Flatten payload to include both snake_case and camelCase keys
  const flattened = {};
  for (const key in payloadObject) {
    if (payloadObject.hasOwnProperty(key)) {
      flattened[key] = payloadObject[key];
      // Add snake_case version
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (snakeKey !== key && !(snakeKey in flattened)) {
        flattened[snakeKey] = payloadObject[key];
      }
      // Add camelCase version
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (camelKey !== key && !(camelKey in flattened)) {
        flattened[camelKey] = payloadObject[key];
      }
    }
  }

  // Try to find parameter values by analyzing the query context around each $N
  // This is a heuristic - ideally the AI generates queries with clear field names
  const params = [];
  
  // Common patterns: WHERE course_id = $1, WHERE learner_id = $2, etc.
  for (const paramNum of paramNumbers) {
    const placeholder = `$${paramNum}`;
    const placeholderIndex = sqlQuery.indexOf(placeholder);
    
    // Look for field name before the placeholder (within 50 chars)
    const contextBefore = sqlQuery.substring(Math.max(0, placeholderIndex - 50), placeholderIndex);
    
    // Try to find matching field name in context
    let foundValue = null;
    
    // Check for common patterns: WHERE field_name = $1, WHERE field_name=$1, etc.
    for (const fieldName in flattened) {
      if (flattened.hasOwnProperty(fieldName)) {
        // Check if field name appears near the placeholder
        const fieldPattern = new RegExp(`${fieldName}\\s*[=<>]\\s*\\$${paramNum}`, 'i');
        if (fieldPattern.test(contextBefore)) {
          foundValue = flattened[fieldName];
          break;
        }
      }
    }
    
    // If not found by context, try common field order mapping
    if (!foundValue) {
      // Common order: course_id, learner_id, user_id, id
      const commonFields = ['course_id', 'courseId', 'learner_id', 'learnerId', 'user_id', 'userId', 'id'];
      const fieldIndex = paramNum - 1;
      if (fieldIndex < commonFields.length) {
        const fieldName = commonFields[fieldIndex];
        if (fieldName in flattened) {
          foundValue = flattened[fieldName];
        }
      }
    }
    
    // If still not found, try direct field lookup by param number
    if (!foundValue) {
      const directKeys = ['course_id', 'courseId', 'learner_id', 'learnerId', 'user_id', 'userId', 'id'];
      for (const key of directKeys) {
        if (key in flattened) {
          foundValue = flattened[key];
          break;
        }
      }
    }
    
    params.push(foundValue !== undefined ? foundValue : null);
  }

  // Filter out null values if they're at the end (optional parameters)
  // But keep nulls if they're in the middle (might be needed)
  return params;
}

/**
 * Validate query security (final check before execution)
 */
function validateQuerySecurity(sqlQuery) {
  const upperQuery = sqlQuery.toUpperCase().trim();

  // Must start with SELECT
  if (!upperQuery.startsWith('SELECT')) {
    throw new Error('Security violation: Only SELECT queries are allowed');
  }

  // Check for dangerous keywords
  const dangerousKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE',
    'TRUNCATE', 'EXEC', 'EXECUTE', 'CALL', 'GRANT', 'REVOKE'
  ];
  
  for (const keyword of dangerousKeywords) {
    // Check for keyword as a standalone word (not part of another word)
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sqlQuery)) {
      throw new Error(`Security violation: Query contains forbidden keyword: ${keyword}`);
    }
  }

  // Check for semicolons that might allow statement chaining
  const queryWithoutStrings = sqlQuery.replace(/'(?:[^'\\]|\\.)*'/g, ''); // Remove string literals
  const semicolonCount = (queryWithoutStrings.match(/;/g) || []).length;
  
  if (semicolonCount > 1) {
    throw new Error('Security violation: Query appears to contain multiple statements');
  }
}

export default {
  executeQuery,
  executeQueryMany,
  extractQueryParams
};
