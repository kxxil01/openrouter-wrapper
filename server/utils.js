/**
 * Utility functions for the Claude Opus wrapper
 */

/**
 * Validates that required environment variables are present
 * @throws {Error} If any required environment variable is missing
 */
export function validateEnv() {
  const requiredVars = ['OPENROUTER_API_KEY'];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }
}

/**
 * Generates a unique request ID
 * @returns {string} A unique request ID
 */
export function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Validates the completion request parameters
 * @param {Object} params - The request parameters
 * @throws {Error} If any required parameter is missing or invalid
 */
export function validateCompletionParams(params) {
  if (!params) {
    throw new Error('Request parameters are required');
  }
  
  if (!params.messages || !Array.isArray(params.messages) || params.messages.length === 0) {
    throw new Error('Messages array is required and must not be empty');
  }
  
  // Validate each message has required fields
  for (const [index, message] of params.messages.entries()) {
    if (!message.role) {
      throw new Error(`Message at index ${index} is missing 'role' field`);
    }
    
    if (!message.content) {
      throw new Error(`Message at index ${index} is missing 'content' field`);
    }
    
    if (!['system', 'user', 'assistant'].includes(message.role)) {
      throw new Error(`Message at index ${index} has invalid role: ${message.role}`);
    }
  }
}

/**
 * Safely parses JSON, returning null on failure instead of throwing
 * @param {string} text - The JSON string to parse
 * @returns {Object|null} The parsed object or null if parsing failed
 */
export function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Implements exponential backoff for retries
 * @param {number} retryCount - The current retry count
 * @param {number} baseDelay - The base delay in milliseconds
 * @returns {number} The delay to wait before the next retry
 */
export function calculateBackoff(retryCount, baseDelay = 1000) {
  // Exponential backoff with jitter
  const expBackoff = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 0.3 * expBackoff; // Add up to 30% jitter
  return expBackoff + jitter;
}

/**
 * Extracts error details from an Axios error
 * @param {Error} error - The error object
 * @returns {Object} Structured error details
 */
export function extractErrorDetails(error) {
  if (!error.response) {
    return {
      status: 'NETWORK_ERROR',
      message: error.message,
      details: 'Network error or timeout'
    };
  }
  
  const { status, data } = error.response;
  
  return {
    status,
    message: data?.error?.message || 'Unknown error',
    details: data?.error || data || 'No details available'
  };
}
