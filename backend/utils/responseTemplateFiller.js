/**
 * Response Template Filler Utility
 * Fills a response template with data from query results
 * 
 * IMPORTANT: Maintains exact field names from the template
 * Maps database column names to template field names
 */

/**
 * Fill response template with query results
 * @param {Object} responseTemplate - Original response template with field names
 * @param {Object|Array} queryResults - Results from database query
 * @returns {Object} - Filled template with same structure as original
 */
export function fillTemplate(responseTemplate, queryResults) {
  if (!responseTemplate || typeof responseTemplate !== 'object') {
    throw new Error('Invalid template: responseTemplate must be an object');
  }

  // Handle case where queryResults is an array (take first element)
  const resultData = Array.isArray(queryResults) 
    ? (queryResults.length > 0 ? queryResults[0] : {})
    : (queryResults || {});

  // Deep clone the template to avoid mutating original
  const filled = JSON.parse(JSON.stringify(responseTemplate));

  // Recursively fill the template
  fillObject(filled, resultData);

  return filled;
}

/**
 * Recursively fill an object with data from query results
 */
function fillObject(templateObj, dataObj) {
  for (const key in templateObj) {
    if (!templateObj.hasOwnProperty(key)) continue;

    const templateValue = templateObj[key];
    const dataValue = dataObj[key];

    // Handle nested objects
    if (templateValue !== null && typeof templateValue === 'object' && !Array.isArray(templateValue)) {
      if (dataValue !== null && typeof dataValue === 'object' && !Array.isArray(dataValue)) {
        fillObject(templateValue, dataValue);
      }
      // If no matching data, leave template structure intact
    }
    // Handle arrays
    else if (Array.isArray(templateValue)) {
      // If data is an array, use it; otherwise keep template array structure
      if (Array.isArray(dataValue)) {
        templateObj[key] = dataValue.map((item, index) => {
          if (typeof item === 'object' && templateValue[0] && typeof templateValue[0] === 'object') {
            // Fill nested array objects
            const filledItem = JSON.parse(JSON.stringify(templateValue[0]));
            fillObject(filledItem, item);
            return filledItem;
          }
          return item;
        });
      }
      // Keep template array structure if no data
    }
    // Handle primitive values (string, number, boolean, null)
    else {
      // Map data value to template field
      // Try exact key match first
      if (key in dataObj && dataValue !== undefined && dataValue !== null) {
        templateObj[key] = dataValue;
      }
      // Try snake_case to camelCase conversion
      else {
        const snakeKey = camelToSnake(key);
        if (snakeKey in dataObj && dataObj[snakeKey] !== undefined && dataObj[snakeKey] !== null) {
          templateObj[key] = dataObj[snakeKey];
        }
        // Try camelCase to snake_case conversion
        else {
          const camelKey = snakeToCamel(key);
          if (camelKey in dataObj && dataObj[camelKey] !== undefined && dataObj[camelKey] !== null) {
            templateObj[key] = dataObj[camelKey];
          }
        }
      }
    }
  }
}

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Extract field names from template (for AI context)
 * @param {Object} template - Response template
 * @returns {Array<string>} - List of field names that need to be filled
 */
export function extractTemplateFields(template) {
  const fields = [];

  function traverse(obj, prefix = '') {
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value, fullKey);
      } else {
        fields.push(fullKey);
      }
    }
  }

  traverse(template);
  return fields;
}

export default {
  fillTemplate,
  extractTemplateFields
};
