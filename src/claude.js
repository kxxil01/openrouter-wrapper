import axios from 'axios';
import { 
  validateCompletionParams, 
  generateRequestId, 
  calculateBackoff,
  extractErrorDetails
} from './utils.js';

/**
 * Claude Opus wrapper using OpenRouter
 */
export class ClaudeOpus {
  /**
   * Creates a new Claude Opus client
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - OpenRouter API key
   * @param {string} [options.modelId] - Model ID to use (defaults to anthropic/claude-3-opus-20240229)
   * @param {number} [options.timeout] - Request timeout in milliseconds
   * @param {number} [options.maxRetries] - Maximum number of retries for failed requests
   * @param {number} [options.retryDelay] - Base delay between retries in milliseconds
   * @param {string} [options.defaultSystemPrompt] - Default system prompt to use
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
    this.modelId = options.modelId || process.env.DEFAULT_MODEL_ID || 'anthropic/claude-3-opus-20240229';
    this.timeout = options.timeout || parseInt(process.env.REQUEST_TIMEOUT_MS || '60000', 10);
    this.maxRetries = options.maxRetries || parseInt(process.env.MAX_RETRIES || '3', 10);
    this.retryDelay = options.retryDelay || parseInt(process.env.RETRY_DELAY_MS || '1000', 10);
    this.defaultSystemPrompt = options.defaultSystemPrompt || process.env.DEFAULT_SYSTEM_PROMPT;
    
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    
    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/kxxil01/openrouter-wrapper', // Updated to actual repository
        'X-Title': 'Claude Opus Wrapper'
      }
    });
  }
  
  /**
   * Prepares messages for the API request, adding system prompt if needed
   * @param {Array} messages - The messages to prepare
   * @returns {Array} Prepared messages
   */
  prepareMessages(messages) {
    // Deep clone to avoid modifying the original
    const preparedMessages = JSON.parse(JSON.stringify(messages));
    
    // Check if there's already a system message
    const hasSystemMessage = preparedMessages.some(msg => msg.role === 'system');
    
    // Add default system message if none exists and we have a default
    if (!hasSystemMessage && this.defaultSystemPrompt) {
      preparedMessages.unshift({
        role: 'system',
        content: this.defaultSystemPrompt
      });
    }
    
    return preparedMessages;
  }
  
  /**
   * Sends a completion request to Claude Opus via OpenRouter
   * @param {Object} params - The completion parameters
   * @param {Array} params.messages - The messages to send
   * @param {number} [params.temperature] - Temperature for sampling
   * @param {number} [params.max_tokens] - Maximum tokens to generate
   * @param {boolean} [params.stream] - Whether to stream the response
   * @param {Function} [params.onProgress] - Callback for streaming progress
   * @returns {Promise<Object>} The completion response
   */
  async createCompletion(params) {
    validateCompletionParams(params);
    
    const requestId = generateRequestId();
    const preparedMessages = this.prepareMessages(params.messages);
    
    const requestParams = {
      model: this.modelId,
      messages: preparedMessages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4096,
      stream: params.stream ?? false
    };
    
    // Handle optional parameters
    if (params.top_p !== undefined) requestParams.top_p = params.top_p;
    if (params.top_k !== undefined) requestParams.top_k = params.top_k;
    if (params.stop !== undefined) requestParams.stop = params.stop;
    if (params.presence_penalty !== undefined) requestParams.presence_penalty = params.presence_penalty;
    if (params.frequency_penalty !== undefined) requestParams.frequency_penalty = params.frequency_penalty;
    
    // For streaming responses
    if (requestParams.stream && typeof params.onProgress === 'function') {
      return this.streamCompletion(requestParams, params.onProgress, requestId);
    }
    
    // For regular responses
    return this.sendCompletionRequest(requestParams, requestId);
  }
  
  /**
   * Sends a regular (non-streaming) completion request
   * @param {Object} requestParams - The request parameters
   * @param {string} requestId - Unique request ID
   * @returns {Promise<Object>} The completion response
   */
  async sendCompletionRequest(requestParams, requestId) {
    let retries = 0;
    
    while (true) {
      try {
        console.log(`[${requestId}] Sending completion request to OpenRouter`);
        const response = await this.client.post('/chat/completions', requestParams);
        
        console.log(`[${requestId}] Received successful response from OpenRouter`);
        return {
          id: response.data.id,
          model: response.data.model,
          object: response.data.object,
          created: response.data.created,
          choices: response.data.choices,
          usage: response.data.usage,
          requestId
        };
      } catch (error) {
        const errorDetails = extractErrorDetails(error);
        console.error(`[${requestId}] Request failed:`, errorDetails);
        
        // Check if we should retry
        if (retries >= this.maxRetries || !this.isRetryableError(error)) {
          throw new Error(`OpenRouter request failed after ${retries} retries: ${errorDetails.message}`);
        }
        
        // Calculate backoff time and retry
        const backoffTime = calculateBackoff(retries, this.retryDelay);
        console.log(`[${requestId}] Retrying in ${Math.floor(backoffTime / 1000)} seconds (retry ${retries + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        retries++;
      }
    }
  }
  
  /**
   * Streams a completion response
   * @param {Object} requestParams - The request parameters
   * @param {Function} onProgress - Callback for streaming progress
   * @param {string} requestId - Unique request ID
   * @returns {Promise<Object>} The aggregated completion response
   */
  async streamCompletion(requestParams, onProgress, requestId) {
    // Ensure the model ID is set
    if (!requestParams.model) {
      requestParams.model = this.modelId;
    }
    
    console.log(`[${requestId}] Starting streaming completion request to ${this.client.defaults.baseURL}/chat/completions`);
    console.log(`[${requestId}] Using model: ${requestParams.model}`);
    console.log(`[${requestId}] API key: ${this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'undefined'}`);
    
    let retries = 0;
    
    while (true) {
      try {
        console.log(`[${requestId}] Sending streaming request (attempt ${retries + 1}/${this.maxRetries + 1})`);
        
        const response = await this.client.post('/chat/completions', requestParams, {
          responseType: 'stream',
          headers: {
            ...this.client.defaults.headers,
            'Accept': 'text/event-stream'
          }
        });
        
        console.log(`[${requestId}] Stream connection established`);
        
        // Create and return a promise that will resolve with the complete response
        return new Promise((resolve, reject) => {
          // Aggregate response data
          const aggregatedResponse = {
            id: null,
            model: this.modelId,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: ''
              },
              finish_reason: null
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            },
            requestId
          };
          
          let buffer = '';
          
          response.data.on('data', (chunk) => {
            try {
              buffer += chunk.toString();
              
              // Process complete SSE messages
              const lines = buffer.split('\n\n');
              buffer = lines.pop(); // Keep the last incomplete chunk
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  
                  if (data === '[DONE]') {
                    console.log(`[${requestId}] Stream completed`);
                    return;
                  }
                  
                  try {
                    // Log the raw data for debugging
                    console.log(`[${requestId}] Raw stream data:`, data.substring(0, 100) + (data.length > 100 ? '...' : ''));
                    
                    const parsedData = JSON.parse(data);
                    
                    // Update aggregated response
                    if (!aggregatedResponse.id && parsedData.id) {
                      aggregatedResponse.id = parsedData.id;
                    }
                    
                    if (parsedData.model) {
                      aggregatedResponse.model = parsedData.model;
                    }
                    
                    // Extract the content - handle both delta and direct content formats
                    let newContent = '';
                    
                    if (parsedData.choices && parsedData.choices[0]) {
                      if (parsedData.choices[0].delta && parsedData.choices[0].delta.content) {
                        // OpenAI-style delta format
                        newContent = parsedData.choices[0].delta.content;
                      } else if (parsedData.choices[0].message && parsedData.choices[0].message.content) {
                        // Direct content format
                        newContent = parsedData.choices[0].message.content;
                      } else if (parsedData.choices[0].text) {
                        // Some APIs use 'text' directly
                        newContent = parsedData.choices[0].text;
                      }
                    }
                    
                    if (newContent) {
                      console.log(`[${requestId}] Received content chunk:`, newContent.substring(0, 20) + (newContent.length > 20 ? '...' : ''));
                      aggregatedResponse.choices[0].message.content += newContent;
                    } else {
                      console.log(`[${requestId}] No content found in chunk:`, JSON.stringify(parsedData).substring(0, 100));
                    }
                    
                    // Update finish reason if present
                    if (parsedData.choices && parsedData.choices[0] && parsedData.choices[0].finish_reason) {
                      aggregatedResponse.choices[0].finish_reason = parsedData.choices[0].finish_reason;
                    }
                    
                    // Update token usage if available
                    if (parsedData.usage) {
                      aggregatedResponse.usage = parsedData.usage;
                    }
                    
                    // Create a standardized format for the callback
                    const callbackData = {
                      choices: [{
                        delta: { content: newContent },
                        index: 0
                      }]
                    };
                    
                    // Call progress callback
                    onProgress(callbackData, aggregatedResponse);
                  } catch (error) {
                    console.error(`[${requestId}] Error parsing stream data:`, error, '\nRaw data:', data);
                  }
                }
              }
            } catch (chunkError) {
              console.error(`[${requestId}] Error processing chunk:`, chunkError);
            }
          });
          
          response.data.on('end', () => {
            console.log(`[${requestId}] Stream ended`);
            resolve(aggregatedResponse);
          });
          
          response.data.on('error', (error) => {
            console.error(`[${requestId}] Stream error:`, error);
            reject(error);
          });
        });
      } catch (error) {
        const errorDetails = extractErrorDetails(error);
        console.error(`[${requestId}] Streaming request failed:`, errorDetails);
        
        // Check if we should retry
        if (retries >= this.maxRetries || !this.isRetryableError(error)) {
          throw new Error(`OpenRouter streaming request failed after ${retries} retries: ${errorDetails.message}`);
        }
        
        // Calculate backoff time and retry
        const backoffTime = calculateBackoff(retries, this.retryDelay);
        console.log(`[${requestId}] Retrying in ${Math.floor(backoffTime / 1000)} seconds (retry ${retries + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        retries++;
      }
    }
  }
  
  /**
   * Determines if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} Whether the error is retryable
   */
  isRetryableError(error) {
    // Network errors are retryable
    if (!error.response) {
      return true;
    }
    
    const status = error.response.status;
    
    // 429 (Too Many Requests) and 5xx errors are retryable
    return status === 429 || (status >= 500 && status < 600);
  }
}
