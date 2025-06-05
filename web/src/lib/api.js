/**
 * API service for interacting with the backend server
 */

// Determine the base API URL based on the current environment
const getApiBaseUrl = () => {
  // For production environment, use relative URL to the same origin
  if (window.location.hostname !== 'localhost') {
    return '/api';
  }
  
  // Always use port 3001 for API server in development
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log(`Using API base URL: ${API_BASE_URL}`);

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * Utility function to retry fetch requests with exponential backoff
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds between retries
 * @returns {Promise<Response>} The fetch response
 */
async function retryFetch(url, options = {}, maxRetries = DEFAULT_RETRY_ATTEMPTS, baseDelay = DEFAULT_RETRY_DELAY) {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Only retry on network errors, 429 (rate limit), or 5xx errors
      if (response.ok || (response.status !== 429 && (response.status < 500 || response.status >= 600))) {
        return response;
      }
      
      // For retryable errors, continue to the retry logic
      console.warn(`Request failed (${response.status}), attempt ${attempt + 1}/${maxRetries + 1}`);
      lastError = new Error(`Server responded with status: ${response.status} ${response.statusText}`);
      
      // If this was the last attempt, return the failed response anyway
      if (attempt === maxRetries) {
        return response;
      }
    } catch (error) {
      // Network errors
      console.warn(`Network error on attempt ${attempt + 1}/${maxRetries + 1}: ${error.message}`);
      lastError = error;
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
    }
    
    // Calculate exponential backoff with jitter
    const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000) * (0.8 + Math.random() * 0.4);
    console.log(`Retrying in ${Math.round(delay)}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // This should only happen if there's a logic error in the retry loop
  throw lastError || new Error('Retry attempt count exceeded');
}

/**
 * Fetch all conversations
 * @returns {Promise<Array>} List of conversations
 */
export async function getConversations() {
  try {
    console.log('Fetching conversations from API...');
    const response = await retryFetch(`${API_BASE_URL}/conversations`);
    console.log('Received response with status:', response.status);
    
    if (!response.ok) {
      try {
        const errorText = await response.text();
        console.log('Error response text:', errorText);
        
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        
        // Try to parse the error as JSON if it's not empty
        if (errorText && errorText.trim() !== '') {
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            } else if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          } catch (jsonParseError) {
            // If we can't parse as JSON, use the text directly if it's not too long
            if (errorText.length < 100) {
              errorMessage = errorText;
            }
          }
        }
        
        throw new Error(errorMessage);
      } catch (jsonError) {
        // If any error occurs during error handling, throw a generic error
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
    
    // Check if response is empty
    const text = await response.text();
    console.log('Response text length:', text ? text.length : 0);
    
    if (!text || text.trim() === '') {
      console.log('Empty response, returning empty array');
      return []; // Return empty array for empty responses
    }
    
    try {
      // Try to parse the JSON
      const data = JSON.parse(text);
      console.log('Successfully parsed JSON, got', Array.isArray(data) ? `${data.length} items` : 'an object');
      return data;
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Raw response:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      // Return empty array instead of throwing to prevent UI errors
      console.log('Returning empty array due to parse error');
      return [];
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}

/**
 * Fetch a conversation by ID
 * @param {string} id - The conversation ID
 * @returns {Promise<Object>} The conversation
 */
export async function getConversationById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch conversation');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
}

/**
 * Create a new conversation
 * @param {string} title - The title of the conversation
 * @param {string} modelId - The ID of the model used
 * @returns {Promise<Object>} The created conversation
 */
export async function createConversation(title, modelId) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        model_id: modelId
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create conversation');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Update a conversation
 * @param {string} id - The conversation ID
 * @param {Object} updates - The fields to update
 * @returns {Promise<Object>} The updated conversation
 */
export async function updateConversation(id, updates) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update conversation');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

/**
 * Delete a conversation and all its messages
 * @param {string} conversationId - The ID of the conversation to delete
 * @returns {Promise<Object>} The response data
 */
export async function deleteConversation(conversationId) {
  if (!conversationId) {
    throw new Error('Conversation ID is required');
  }
  
  console.log(`Deleting conversation ${conversationId}`);
  
  try {
    const response = await retryFetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: { message: `HTTP error ${response.status}` } 
      }));
      
      throw new Error(errorData.error?.message || `Failed to delete conversation (HTTP ${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error deleting conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Fetch messages for a conversation
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<Array>} List of messages
 */
export async function getMessagesForConversation(conversationId) {
  try {
    console.log(`Fetching messages for conversation: ${conversationId}`);
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
    console.log('Received messages response with status:', response.status);
    
    if (!response.ok) {
      try {
        const errorText = await response.text();
        console.log('Error response text:', errorText);
        
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        
        // Try to parse the error as JSON if it's not empty
        if (errorText && errorText.trim() !== '') {
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            } else if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          } catch (jsonParseError) {
            // If we can't parse as JSON, use the text directly if it's not too long
            if (errorText.length < 100) {
              errorMessage = errorText;
            }
          }
        }
        
        throw new Error(errorMessage);
      } catch (jsonError) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    }
    
    // Check if response is empty
    const text = await response.text();
    console.log('Messages response text length:', text ? text.length : 0);
    
    if (!text || text.trim() === '') {
      console.log('Empty messages response, returning empty array');
      return []; // Return empty array for empty responses
    }
    
    try {
      // Try to parse the JSON
      const data = JSON.parse(text);
      console.log('Successfully parsed messages JSON, got', Array.isArray(data) ? `${data.length} messages` : 'an object');
      return data;
    } catch (parseError) {
      console.error('Error parsing messages JSON response:', parseError);
      console.error('Raw messages response:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      // Return empty array instead of throwing to prevent UI errors
      console.log('Returning empty array due to parse error');
      return [];
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}

/**
 * Save a message to the database
 * @param {string} conversationId - The conversation ID
 * @param {string} role - The message role (user/assistant)
 * @param {string} content - The message content
 * @returns {Promise<Object>} The saved message
 */
export async function saveMessage(conversationId, role, content) {
  try {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        role,
        content
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

/**
 * Send a message to Claude API via chat/completions endpoint
 * @param {string} modelId - The model ID to use
 * @param {Array} messages - The messages to send
 * @param {boolean} stream - Whether to stream the response
 * @param {string} conversationId - The conversation ID
 * @param {Function} onStreamChunk - Callback for each stream chunk
 * @param {Function} onStreamError - Callback for stream errors
 * @param {Function} onStreamComplete - Callback for stream completion
 * @returns {Promise<Object|ReadableStream>} The Claude response or stream controller
 */
export async function sendMessageToClaudeAPI(
  modelId, 
  messages, 
  stream = false, 
  conversationId = null, 
  onStreamChunk, 
  onStreamError, 
  onStreamComplete
) {
  try {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Valid messages array is required');
    }
    
    const payload = {
      model: modelId,
      messages: messages,
      stream: stream,
      conversation_id: conversationId
    };
    
    console.log(`Sending ${stream ? 'streaming' : 'non-streaming'} request to Claude API with ${messages.length} messages`);
    
    if (stream) {
      // For streaming requests
      console.log('Starting streaming request...');
      console.log('Messages being sent:', JSON.stringify(messages));
      let fullContent = '';
      
      // Create a controller that allows aborting the stream
      const abortController = new AbortController();
      const controller = {
        abort: () => {
          console.log('Stream manually aborted by client');
          abortController.abort();
        }
      };
      
      // Make the API request
      try {
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(payload),
          signal: abortController.signal
        });
        
        if (!response.ok) {
          // Handle HTTP error responses
          let errorMessage = `Server error: ${response.status} ${response.statusText}`;
          
          try {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error && errorJson.error.message) {
                errorMessage = errorJson.error.message;
              }
            } catch (e) {
              // If parsing fails, use the raw text if it's not too long
              if (errorText && errorText.length < 200) errorMessage = errorText;
            }
          } catch (e) {
            console.error('Failed to read error response:', e);
          }
          
          console.error('Streaming request failed:', errorMessage);
          if (onStreamError) onStreamError(new Error(errorMessage));
          return controller;
        }
        
        // Create a reader from the response body
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        // Process the stream
        (async () => {
          try {
            console.log('Stream started, processing chunks...');
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                console.log('Stream complete, total content length:', fullContent.length);
                
                // Call the completion callback with the accumulated content
                if (onStreamComplete) {
                  onStreamComplete(fullContent);
                }
                break;
              }
              
              // Decode the chunk and add to buffer
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;
              
              // Split buffer by double newlines (SSE format)
              const events = buffer.split('\n\n');
              buffer = events.pop() || ''; // Keep last incomplete event in buffer
              
              // Process complete events
              for (const event of events) {
                if (!event.trim() || !event.startsWith('data: ')) continue;
                
                // Extract data payload
                const data = event.substring(6).trim();
                
                // Handle DONE marker
                if (data === '[DONE]') {
                  console.log('Received [DONE] event');
                  continue;
                }
                
                // Parse JSON data
                try {
                  const parsedData = JSON.parse(data);
                  
                  // Check for errors
                  if (parsedData.error) {
                    console.error('Error in stream data:', parsedData.error);
                    if (onStreamError) {
                      onStreamError(new Error(parsedData.error.message || 'Stream error'));
                    }
                    continue;
                  }
                  
                  // Extract content from OpenAI-compatible format
                  let content = '';
                  if (parsedData.choices && 
                      parsedData.choices[0] && 
                      parsedData.choices[0].delta && 
                      parsedData.choices[0].delta.content) {
                    content = parsedData.choices[0].delta.content;
                    
                    // Add to accumulated content
                    fullContent += content;
                    
                    // Send chunk to callback
                    console.log(`Received chunk: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
                    if (onStreamChunk) {
                      onStreamChunk(content);
                    }
                  } else {
                    console.log('Received a non-content chunk:', JSON.stringify(parsedData));
                  }
                } catch (parseError) {
                  console.error('Error parsing stream data:', parseError, 'Raw data:', data.substring(0, 100));
                }
              }
            }
          } catch (streamError) {
            // Handle errors during stream processing
            console.error('Stream processing error:', streamError);
            
            // Only call error handler if the error isn't due to manual abort
            if (!abortController.signal.aborted && onStreamError) {
              onStreamError(streamError);
            }
          }
        })();
        
        // Return the controller so caller can abort if needed
        return controller;
      } catch (fetchError) {
        console.error('Fetch error during streaming:', fetchError);
        if (onStreamError) onStreamError(fetchError);
        return controller;
      }
    } else {
      // For non-streaming requests, use retryFetch for improved reliability
      const response = await retryFetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
        throw new Error(errorData.error?.message || 'Failed to get response from Claude');
      }
      
      return await response.json();
    }
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}
