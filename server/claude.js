import axios from 'axios';

/**
 * Claude Opus wrapper using OpenRouter
 */
export class ClaudeOpus {
  /**
   * Creates a new Claude Opus client
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - OpenRouter API key
   * @param {string} [options.modelId] - Model ID to use
   * @param {number} [options.timeout] - Request timeout in milliseconds
   * @param {number} [options.maxRetries] - Maximum number of retries for failed requests
   * @param {number} [options.retryDelay] - Base delay between retries in milliseconds
   * @param {string} [options.defaultSystemPrompt] - Default system prompt to use
   */
  constructor(options = {}) {
    try {
      // Validate and set API key
      this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
      if (!this.apiKey) {
        console.warn('OpenRouter API key is missing - Claude API functionality will be unavailable');
        this.isConfigured = false;
        return; // Exit constructor early without creating axios client
      }
      
      // Validate and set model ID
      this.modelId = options.modelId || process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4';
      if (!this.modelId.includes('/')) {
        console.warn(`Model ID format may be invalid: ${this.modelId}. Expected format: 'provider/model-name'`);
      }
      
      // Set other configuration options with validation
      this.timeout = this._parseIntSafely(options.timeout || process.env.REQUEST_TIMEOUT_MS, 60000);
      this.maxRetries = this._parseIntSafely(options.maxRetries || process.env.MAX_RETRIES, 3);
      this.retryDelay = this._parseIntSafely(options.retryDelay || process.env.RETRY_DELAY_MS, 1000);
      this.defaultSystemPrompt = options.defaultSystemPrompt || process.env.DEFAULT_SYSTEM_PROMPT || '';
      
      // Set default request ID generator
      this.generateRequestId = options.generateRequestId || (() => Math.random().toString(36).substring(2, 10));
      
      // Log configuration
      console.log(`Initializing Claude client with model: ${this.modelId}`);
      console.log(`API key exists: ${!!this.apiKey}, length: ${this.apiKey?.length || 0}`);
      console.log(`Timeout: ${this.timeout}ms, Max retries: ${this.maxRetries}, Retry delay: ${this.retryDelay}ms`);
      
      this.isConfigured = true;
      
      // Create axios client with proper headers for OpenRouter
      this.client = axios.create({
        baseURL: 'https://openrouter.ai/api/v1',
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://claude-opus-wrapper.com', // Use a proper domain for OpenRouter
          'X-Title': 'Claude Opus Wrapper'
        }
      });
      
      // Add response interceptor for better error handling
      this.client.interceptors.response.use(
        response => response,
        error => {
          const requestId = this.generateRequestId();
          console.error(`[${requestId}] OpenRouter API error:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          });
          return Promise.reject(error);
        }
      );
      
      // Log successful initialization
      console.log('Claude client initialized successfully with OpenRouter API');
    } catch (error) {
      console.error('Error initializing Claude client:', error);
      this.isConfigured = false;
    }
  }
  
  /**
   * Helper method to safely parse integers with fallback
   * @private
   */
  _parseIntSafely(value, defaultValue) {
    try {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }
  
  /**
   * Prepares messages for the API request, adding system prompt if needed and validating message format
   * @param {Array} messages - The messages to prepare
   * @param {string} requestId - Request ID for logging
   * @returns {Array} Prepared messages
   */
  prepareMessages(messages, requestId) {
    if (!messages || !Array.isArray(messages)) {
      console.error(`[${requestId}] Invalid messages format: not an array`);
      throw new Error('Messages must be an array');
    }
    
    if (messages.length === 0) {
      console.error(`[${requestId}] Empty messages array`);
      throw new Error('Messages array cannot be empty');
    }
    
    // Validate each message has required properties
    const validatedMessages = messages.map((msg, index) => {
      if (!msg || typeof msg !== 'object') {
        console.error(`[${requestId}] Invalid message at index ${index}: not an object`);
        throw new Error(`Message at index ${index} must be an object`);
      }
      
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        console.error(`[${requestId}] Invalid role at index ${index}: ${msg.role}`);
        throw new Error(`Message at index ${index} has invalid role: ${msg.role}. Must be 'user', 'assistant', or 'system'`);
      }
      
      if (msg.content === undefined || msg.content === null) {
        console.error(`[${requestId}] Missing content at index ${index}`);
        throw new Error(`Message at index ${index} is missing content`);
      }
      
      // Ensure content is a string
      return {
        ...msg,
        content: String(msg.content)
      };
    });
    
    // Add default system prompt if none exists and we have one configured
    if (this.defaultSystemPrompt && !validatedMessages.some(msg => msg.role === 'system')) {
      console.log(`[${requestId}] Adding default system prompt`);
      return [
        { role: 'system', content: this.defaultSystemPrompt },
        ...validatedMessages
      ];
    }
    
    return validatedMessages;
  }
  
  /**
   * Sends a completion request to Claude Opus via OpenRouter
   * @param {Object} options - Request options
   * @param {Array} options.messages - Messages for the conversation
   * @param {string} [options.model] - Model ID to use
   * @param {number} [options.temperature] - Temperature for response generation
   * @param {number} [options.max_tokens] - Maximum tokens to generate
   * @param {number} [options.top_p] - Top p for nucleus sampling
   * @param {boolean} [options.stream] - Whether to stream the response
   * @returns {Promise<Object>} The completion response
   */
  async createCompletion(options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Claude client is not properly configured. Check your API key.');
      }
      
      // Generate a unique request ID for tracking this request through logs
      const requestId = this.generateRequestId();
      
      // Extract and validate options with defaults
      const { 
        messages, 
        model = this.modelId, 
        temperature = 0.7, 
        max_tokens = 4000, 
        top_p = 0.9, 
        stream = false,
        stop = undefined,
        user = undefined
      } = options;
      
      console.log(`[${requestId}] Creating completion with model: ${model}`);
      console.log(`[${requestId}] Parameters: temp=${temperature}, max_tokens=${max_tokens}, top_p=${top_p}, stream=${stream}`);
      
      // Handle streaming requests differently
      if (stream) {
        console.log(`[${requestId}] Stream requested, using streamCompletion method`);
        return this.streamCompletion({...options, requestId});
      }
      
      // Prepare and validate messages
      const preparedMessages = this.prepareMessages(messages, requestId);
      console.log(`[${requestId}] Prepared ${preparedMessages.length} messages`);
      
      // Build request body for OpenRouter API
      const requestBody = {
        messages: preparedMessages,
        model,
        temperature,
        max_tokens,
        top_p,
        stream: false
      };
      
      // Add optional parameters if provided
      if (stop) requestBody.stop = stop;
      if (user) requestBody.user = user;
      
      // Log request parameters (excluding full message content for brevity)
      const logParams = { ...requestBody };
      logParams.messages = logParams.messages.map(m => ({ role: m.role, content_length: m.content.length }));
      console.log(`[${requestId}] Request parameters: ${JSON.stringify(logParams)}`);
      
      // Send the request to OpenRouter API
      console.log(`[${requestId}] Sending request to OpenRouter API`);
      const response = await this.sendCompletionRequest(requestBody, requestId);
      console.log(`[${requestId}] Received response from OpenRouter API`);
      return response;
    } catch (error) {
      const requestId = this.generateRequestId();
      console.error(`[${requestId}] Error in createCompletion:`, error.message);
      
      // Enhance error with more context
      const enhancedError = new Error(`Claude API error: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.requestId = requestId;
      enhancedError.statusCode = error.response?.status;
      enhancedError.responseData = error.response?.data;
      
      throw enhancedError;
    }
  }
  
  /**
   * Sends a regular (non-streaming) completion request
   * @param {Object} requestParams - The request parameters
   * @param {string} requestId - Unique request ID
   * @returns {Promise<Object>} The completion response
   */
  async sendCompletionRequest(requestParams, requestId) {
    if (!this.isConfigured) {
      throw new Error('Claude client is not properly configured. Check your API key.');
    }
    let retries = 0;
    
    while (true) {
      try {
        console.log(`[${requestId}] Sending request to OpenRouter API (attempt ${retries + 1}/${this.maxRetries + 1})`);
        console.log(`[${requestId}] Request payload:`, JSON.stringify({
          ...requestParams,
          messages: requestParams.messages ? `[${requestParams.messages.length} messages]` : undefined
        }, null, 2));
        
        const response = await this.client.post('/chat/completions', requestParams);
        console.log(`[${requestId}] Request successful with status ${response.status}`);
        
        if (!response.data) {
          console.error(`[${requestId}] Empty response data received`);
          throw new Error('Empty response received from OpenRouter API');
        }
        
        console.log(`[${requestId}] Response data:`, JSON.stringify({
          id: response.data.id,
          model: response.data.model,
          choices: response.data.choices ? `[${response.data.choices.length} choices]` : undefined,
          usage: response.data.usage
        }, null, 2));
        
        return response.data;
      } catch (error) {
        console.error(`[${requestId}] Request failed:`, error.message);
        
        if (error.response) {
          console.error(`[${requestId}] Response status:`, error.response.status);
          console.error(`[${requestId}] Response data:`, JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
          console.error(`[${requestId}] No response received:`, error.request);
        } else {
          console.error(`[${requestId}] Error setting up request:`, error.message);
        }
        
        if (retries >= this.maxRetries) {
          console.error(`[${requestId}] Max retries reached, throwing error`);
          throw new Error(`OpenRouter API request failed: ${error.message}`);
        }
        
        const backoffTime = Math.min(this.retryDelay * Math.pow(2, retries), 30000);
        console.log(`[${requestId}] Retrying in ${Math.floor(backoffTime / 1000)} seconds (retry ${retries + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        retries++;
      }
    }
  }
  
  /**
   * Stream a completion from Claude
   * @param {Object} options - Request options
   * @param {Array} options.messages - Messages for the conversation
   * @param {string} [options.model] - Model ID to use
   * @param {number} [options.temperature] - Temperature for sampling
   * @param {number} [options.max_tokens] - Maximum tokens to generate
   * @param {number} [options.top_p] - Top p sampling parameter
   * @param {Function} [options.onProgress] - Callback for each chunk
   * @param {Function} [options.onComplete] - Callback when stream completes
   * @param {Function} [options.onError] - Callback for errors
   * @returns {Promise<string>} - Aggregated content from the stream
   */
  async streamCompletion(options = {}) {
    const requestId = this.generateRequestId();
    let retries = 0;
    let aggregatedContent = '';
    
    try {
      if (!this.isConfigured) {
        throw new Error('Claude client is not properly configured. Check your API key.');
      }
      
      // Extract options with defaults
      const { 
        messages, 
        model = this.modelId, 
        temperature = 0.7, 
        max_tokens = 4000, 
        top_p = 0.9,
        onProgress = () => {},
        onComplete = () => {},
        onError = () => {},
        stop,
        user,
        ...otherOptions 
      } = options;
      
      console.log(`[${requestId}] Creating streaming completion with model: ${model}`);
      console.log(`[${requestId}] Parameters: temp=${temperature}, max_tokens=${max_tokens}, top_p=${top_p}, stream=true`);
      
      // Prepare and validate messages
      const preparedMessages = this.prepareMessages(messages, requestId);
      console.log(`[${requestId}] Prepared ${preparedMessages.length} messages for streaming`);
      
      // Build request body for API
      const requestParams = {
        messages: preparedMessages,
        model,
        temperature,
        max_tokens,
        top_p,
        stream: true
      };
      
      // Add optional parameters if provided
      if (stop) requestParams.stop = stop;
      if (user) requestParams.user = user;
      
      // Add any other options passed
      Object.assign(requestParams, otherOptions);
      
      // For debugging
      const debugRequestParams = { ...requestParams };
      if (debugRequestParams.messages) {
        debugRequestParams.messages = `[${debugRequestParams.messages.length} messages]`;
      }
      console.log(`[${requestId}] Request params:`, JSON.stringify(debugRequestParams, null, 2));
      
      // Retry loop for the initial connection
      while (retries <= this.maxRetries) {
        try {
          console.log(`[${requestId}] Sending streaming request (attempt ${retries + 1}/${this.maxRetries + 1})`);
          
          // Use axios with responseType: 'stream' to handle streaming properly
          const response = await this.client.post('/chat/completions', requestParams, {
            responseType: 'stream',
            headers: {
              'Accept': 'text/event-stream',
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://claude-opus-wrapper.com'
            },
            validateStatus: status => status >= 200 && status < 300
          });
          
          console.log(`[${requestId}] Stream response received with status ${response.status}`);
          
          if (!response.data) {
            throw new Error('Empty response data from API');
          }
          
          // Set up stream processing
          const textDecoder = new TextDecoder('utf-8');
          let buffer = '';
          
          // Process each chunk as it arrives in real-time
          for await (const chunk of response.data) {
            const decodedChunk = textDecoder.decode(chunk, { stream: true });
            
            // Check for HTML error page in the first chunk
            if (buffer.length === 0 && (
              decodedChunk.trim().startsWith('<!DOCTYPE') || 
              decodedChunk.trim().startsWith('<html')
            )) {
              throw new Error('Received HTML instead of JSON. The API may be returning an error page.');
            }
            
            // Add to buffer and process complete events
            buffer += decodedChunk;
            
            // Process complete events in buffer
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // Keep the last incomplete event in the buffer
            
            for (const event of events) {
              if (!event.trim() || !event.startsWith('data: ')) continue;
              
              const data = event.substring(6);
              
              // Skip [DONE] marker
              if (data.trim() === '[DONE]') {
                console.log(`[${requestId}] Received [DONE] marker`);
                continue;
              }
              
              try {
                const parsed = JSON.parse(data);
                
                // Extract content from the response based on format
                let content = '';
                
                if (parsed.choices && parsed.choices[0]) {
                  // OpenAI-compatible format
                  if (parsed.choices[0].delta && parsed.choices[0].delta.content) {
                    content = parsed.choices[0].delta.content;
                  } else if (parsed.choices[0].message && parsed.choices[0].message.content) {
                    content = parsed.choices[0].message.content;
                  } else if (parsed.choices[0].text) {
                    content = parsed.choices[0].text;
                  }
                } else if (parsed.content) {
                  // Direct content format
                  content = parsed.content;
                }
                
                if (content) {
                  console.log(`[${requestId}] Received content chunk: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`);
                  aggregatedContent += content;
                  
                  // Call progress callback with just this chunk
                  onProgress(content);
                }
              } catch (parseError) {
                console.error(`[${requestId}] Error parsing event data:`, parseError);
              }
            }
          }
          
          // Process any remaining buffer content
          if (buffer.trim()) {
            if (buffer.startsWith('data: ')) {
              const data = buffer.substring(6).trim();
              
              if (data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  let content = '';
                  
                  if (parsed.choices && parsed.choices[0]) {
                    if (parsed.choices[0].delta && parsed.choices[0].delta.content) {
                      content = parsed.choices[0].delta.content;
                    }
                  } else if (parsed.content) {
                    content = parsed.content;
                  }
                  
                  if (content) {
                    aggregatedContent += content;
                    onProgress(content);
                  }
                } catch (e) {
                  console.error(`[${requestId}] Error parsing final buffer:`, e);
                }
              }
            }
          }
          
          console.log(`[${requestId}] Stream completed, total content length: ${aggregatedContent.length}`);
          onComplete(aggregatedContent);
          return aggregatedContent;
          
        } catch (error) {
          console.error(`[${requestId}] Error in streaming attempt ${retries + 1}:`, error);
          
          if (retries < this.maxRetries) {
            retries++;
            const delay = this.retryDelay * retries;
            console.log(`[${requestId}] Retrying in ${delay}ms... (${retries}/${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.error(`[${requestId}] Max retries reached, giving up`);
            onError(error);
            throw error;
          }
        }
      }
    } catch (error) {
      const errorId = this.generateRequestId();
      console.error(`[${errorId}] Error in streamCompletion:`, error.message);
      
      // Call error callback if provided
      if (options.onError) {
        options.onError(error);
      }
      
      // Enhance error with more context
      const enhancedError = new Error(`Claude streaming error: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.requestId = errorId;
      
      // Safely access error.response properties
      if (error.response) {
        enhancedError.statusCode = error.response.status;
        enhancedError.responseData = error.response.data;
      } else {
        enhancedError.statusCode = null;
        enhancedError.responseData = null;
      }
      
      throw enhancedError;
    }
  }
}

export default ClaudeOpus;
