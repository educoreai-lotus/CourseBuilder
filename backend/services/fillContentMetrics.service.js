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
 * Supports both Data-Filling mode (SELECT) and Action/Command mode (INSERT/UPDATE/DELETE)
 * @param {Object} payloadObject - Parsed payload from request
 * @param {Object} responseTemplate - Parsed response template to fill
 * @param {string|null} action - Action from payload (optional)
 * @param {boolean} isActionMode - True if Action/Command mode, false if Data-Filling mode
 * @param {string|null} requestId - Request ID for logging (optional)
 * @returns {Promise<Object>} - Filled response template
 */
export async function fillContentMetrics(payloadObject, responseTemplate, action = null, isActionMode = false, requestId = null) {
  const logPrefix = requestId ? `[Fill Content Metrics] [${requestId}]` : '[Fill Content Metrics]';
  const startTime = Date.now();
  
  try {
    console.log(`${logPrefix} 🚀 Starting fillContentMetrics`);
    console.log(`${logPrefix}   - Mode: ${isActionMode ? 'Action/Command' : 'Data-Filling'}`);
    console.log(`${logPrefix}   - Action: ${action || 'N/A'}`);
    
    // Step 1: Generate SQL query using AI
    console.log(`${logPrefix} 🤖 Step 1: Generating SQL query using AI...`);
    const aiStartTime = Date.now();
    const sqlQuery = await generateSQLQuery(payloadObject, responseTemplate, action, isActionMode, requestId);
    const aiDuration = Date.now() - aiStartTime;
    console.log(`${logPrefix} ✅ SQL query generated in ${aiDuration}ms`);
    console.log(`${logPrefix} 📝 Generated SQL:`, sqlQuery);

    // Step 2: Extract parameters from payload for the query
    console.log(`${logPrefix} 🔍 Step 2: Extracting query parameters from payload...`);
    const params = extractQueryParams(payloadObject, sqlQuery);
    console.log(`${logPrefix} 📋 Extracted params:`, params);
    
    // Filter out undefined/null params that might not be needed
    // Keep nulls if they're expected by the query (use original params)
    const queryParams = params.filter(p => p !== undefined);
    console.log(`${logPrefix} 📋 Filtered params (${queryParams.length}):`, queryParams);

    // Step 3: Execute the query (supports both SELECT and INSERT/UPDATE/DELETE)
    console.log(`${logPrefix} ⚡ Step 3: Executing query...`);
    const execStartTime = Date.now();
    const queryResults = await executeQuery(sqlQuery, queryParams, isActionMode, requestId);
    const execDuration = Date.now() - execStartTime;
    console.log(`${logPrefix} ✅ Query executed in ${execDuration}ms`);
    console.log(`${logPrefix} 📊 Query results:`, JSON.stringify(queryResults, null, 2));

    // Step 4: Fill the response template with query results
    console.log(`${logPrefix} 🎯 Step 4: Filling response template with query results...`);
    const fillStartTime = Date.now();
    const filledTemplate = fillTemplate(responseTemplate, queryResults);
    const fillDuration = Date.now() - fillStartTime;
    console.log(`${logPrefix} ✅ Template filled in ${fillDuration}ms`);
    console.log(`${logPrefix} 📦 Filled template:`, JSON.stringify(filledTemplate, null, 2));

    const totalDuration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ fillContentMetrics completed in ${totalDuration}ms`);
    
    return filledTemplate;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ ERROR after ${totalDuration}ms:`, error);
    console.error(`${logPrefix} Error stack:`, error.stack);
    
    // Return a clean error without exposing internal details
    throw new Error(`Failed to fill content metrics: ${error.message}`);
  }
}

export default {
  fillContentMetrics
};
