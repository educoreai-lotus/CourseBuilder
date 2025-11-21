/**
 * Fill Content Metrics Service
 * Main service that orchestrates AI query generation, execution, and template filling
 * 
 * This service is called when Course Builder needs to fill response templates
 * with data from its own database using AI-generated SQL queries.
 */

import { generateSQLQuery } from './aiQueryBuilder.service.js';
import { executeQuery, extractQueryParams } from './queryExecutor.service.js';
import { fillTemplate } from '../utils/responseTemplateFiller.js';

/**
 * Fill response template with data from Course Builder database
 * @param {Object} payloadObject - Parsed payload from request
 * @param {Object} responseTemplate - Parsed response template to fill
 * @returns {Promise<Object>} - Filled response template
 */
export async function fillContentMetrics(payloadObject, responseTemplate) {
  try {
    // Step 1: Generate SQL query using AI
    console.log('[Fill Content Metrics] Generating SQL query...');
    const sqlQuery = await generateSQLQuery(payloadObject, responseTemplate);
    console.log('[Fill Content Metrics] Generated SQL:', sqlQuery);

    // Step 2: Extract parameters from payload for the query
    const params = extractQueryParams(payloadObject, sqlQuery);
    console.log('[Fill Content Metrics] Query params:', params);
    
    // Filter out undefined/null params that might not be needed
    // Keep nulls if they're expected by the query (use original params)
    const queryParams = params.filter(p => p !== undefined);

    // Step 3: Execute the query
    console.log('[Fill Content Metrics] Executing query...');
    const queryResults = await executeQuery(sqlQuery, queryParams);
    console.log('[Fill Content Metrics] Query results:', queryResults);

    // Step 4: Fill the response template with query results
    console.log('[Fill Content Metrics] Filling template...');
    const filledTemplate = fillTemplate(responseTemplate, queryResults);
    console.log('[Fill Content Metrics] Filled template:', filledTemplate);

    return filledTemplate;
  } catch (error) {
    console.error('[Fill Content Metrics] Error:', error);
    
    // Return a clean error without exposing internal details
    throw new Error(`Failed to fill content metrics: ${error.message}`);
  }
}

export default {
  fillContentMetrics
};
