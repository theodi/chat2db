/**
 * Response formatter utility for Chat2DB
 * Handles formatting responses based on configuration
 */

/**
 * Format a complete response based on configuration
 * @param {Object} data - Response data
 * @param {Object} config - Response configuration
 * @returns {string} Formatted response
 */
function formatResponse(data, config) {
  const responseConfig = config.responseSections || {
    intent: true,
    reasoning: true,
    query: true,
    result: true,
    summary: true,
    chartSuggestion: true
  };

  let response = '';

  // Add intent if enabled
  if (responseConfig.intent && data.interpretation?.intent) {
    response += `**Intent:** ${data.interpretation.intent}\n\n`;
  }

  // Add reasoning if enabled
  if (responseConfig.reasoning && data.interpretation?.reasoning) {
    response += `**Reasoning:** ${data.interpretation.reasoning}\n\n`;
  }

  // Add query if enabled
  if (responseConfig.query && data.interpretation?.query) {
    response += "**Query:**\n```js\n" + data.interpretation.query + "\n```\n\n";
  }

  // Add result if enabled
  if (responseConfig.result && data.dbResult) {
    const rawResult = JSON.stringify(data.dbResult, null, 2);
    response += "**Result:**\n```json\n" + rawResult + "\n```\n\n";
  }

  // Add summary if enabled
  if (responseConfig.summary && data.summary) {
    response += "**Summary:**\n" + data.summary + "\n\n";
  }

  return response;
}

/**
 * Get response configuration with defaults
 * @param {Object} config - Configuration object
 * @returns {Object} Response configuration
 */
function getResponseConfig(config) {
  return config.responseSections || {
    intent: true,
    reasoning: true,
    query: true,
    result: true,
    summary: true,
    chartSuggestion: true
  };
}

/**
 * Check if a specific section should be included
 * @param {string} section - Section name
 * @param {Object} config - Configuration object
 * @returns {boolean} Whether section should be included
 */
function shouldIncludeSection(section, config) {
  const responseConfig = getResponseConfig(config);
  return responseConfig[section] === true;
}

/**
 * Validate response configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateResponseConfig(config) {
  const validSections = ['intent', 'reasoning', 'query', 'result', 'summary', 'chartSuggestion'];
  const responseConfig = config.responseSections || {};
  
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check for invalid sections
  Object.keys(responseConfig).forEach(section => {
    if (!validSections.includes(section)) {
      validation.errors.push(`Invalid response section: ${section}`);
      validation.isValid = false;
    }
  });

  // Check if at least summary is enabled
  if (responseConfig.summary === false && responseConfig.intent === false && 
      responseConfig.reasoning === false && responseConfig.query === false && 
      responseConfig.result === false) {
    validation.warnings.push('All response sections are disabled. Users will see minimal output.');
  }

  return validation;
}

module.exports = {
  formatResponse,
  getResponseConfig,
  shouldIncludeSection,
  validateResponseConfig
}; 