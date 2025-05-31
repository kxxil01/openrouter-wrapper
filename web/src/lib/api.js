/**
 * API service for interacting with the backend server
 */

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Fetch all conversations
 * @returns {Promise<Array>} List of conversations
 */
export async function getConversations() {
  try {
    console.log('Fetching conversations from API...');
    const response = await fetch(`${API_BASE_URL}/conversations`);
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
 * Delete a conversation
 * @param {string} id - The conversation ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteConversation(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete conversation');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
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
 * Send a message to the Claude API
 * @param {string} modelId - The model ID
 * @param {Array} messages - The conversation messages
 * @param {boolean} stream - Whether to stream the response
 * @param {string} [conversationId] - The conversation ID for database storage
 * @param {Function} [onStreamChunk] - Callback for each stream chunk (when streaming)
 * @param {Function} [onStreamError] - Callback for stream errors (when streaming)
 * @param {Function} [onStreamComplete] - Callback when stream completes (when streaming)
 * @returns {Promise<Object|ReadableStream>} The API response or a controller to manage the stream
 */
export async function sendMessageToClaudeAPI(modelId, messages, stream = false, conversationId = null, onStreamChunk, onStreamError, onStreamComplete) {
  try {
    // Validate inputs
    if (!modelId) throw new Error('Model ID is required');
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('Messages must be a non-empty array');
    
    // Log request details (without full message content for privacy/brevity)
    const requestId = Math.random().toString(36).substring(2, 10);
    console.log(`[${requestId}] Sending request to Claude API via backend proxy:`);
    console.log(`[${requestId}] Model: ${modelId}, Messages: ${messages.length}, Stream: ${stream}, Conversation: ${conversationId || 'none'}`);
    
    // Prepare request
    const requestBody = {
      model: modelId,
      messages,
      stream,
      conversation_id: conversationId
    };
    
    // Send request to backend proxy
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': stream ? 'text/event-stream' : 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Handle non-OK responses
    if (!response.ok) {
      let errorData;
      let responseClone = response.clone(); // Clone the response to avoid reading the body multiple times
      
      try {
        errorData = await responseClone.json();
      } catch (parseError) {
        // Handle case where response isn't valid JSON
        console.error(`[${requestId}] Failed to parse error response:`, parseError);
        
        try {
          const responseText = await response.text();
          
          // Check if the response is HTML (error page)
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
            console.error(`[${requestId}] Received HTML error page instead of JSON`);
            errorData = { error: 'Received HTML error page from server' };
          } else {
            errorData = { error: 'Unknown error format from server', raw: responseText.substring(0, 200) };
          }
        } catch (textError) {
          console.error(`[${requestId}] Failed to parse error response as text:`, textError);
          errorData = { error: 'Failed to read error response' };
        }
      }
      
      console.error(`[${requestId}] API error response:`, errorData);
      
      // Create a more informative error message
      const errorMessage = errorData.error || errorData.message || `Failed to send message to Claude API (${response.status})`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.code = errorData.code || 'unknown_error';
      error.details = errorData.details || null;
      error.requestId = requestId;
      
      if (stream && onStreamError) {
        onStreamError(error);
      }
      
      throw error;
    }
    
    // Handle streaming responses
    if (stream) {
      console.log(`[${requestId}] Processing streaming response`);
      
      // For streaming, set up a reader and process chunks
      let reader;
      try {
        reader = response.body.getReader();
      } catch (readerError) {
        console.error(`[${requestId}] Error setting up stream reader:`, readerError);
        if (onStreamError) {
          onStreamError(new Error(`Error setting up streaming: ${readerError.message}`));
        }
        return { controller: { abort: () => {} } };
      }
      
      let decoder = new TextDecoder();
      let buffer = '';
      
      // Create an abort controller to allow the caller to cancel the stream
      const controller = {
        abort: () => {
          console.log(`[${requestId}] Stream manually aborted by client`);
          reader.cancel();
        }
      };
      
      // Start processing the stream
      (async () => {
        try {
          console.log(`[${requestId}] Starting to process stream chunks`);
          let accumulatedContent = '';
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log(`[${requestId}] Stream complete, total content length: ${accumulatedContent.length}`);
              if (onStreamComplete) onStreamComplete(accumulatedContent);
              break;
            }
            
            // Decode the chunk and add to buffer
            const chunk = decoder.decode(value, { stream: true });
            console.log(`[${requestId}] Received raw chunk: ${chunk.substring(0, 50)}...`);
            buffer += chunk;
            
            // Process complete events in buffer
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // Keep the last incomplete event in the buffer
            
            for (const event of events) {
              if (event.trim() === '') continue;
              
              if (!event.startsWith('data: ')) {
                console.warn(`[${requestId}] Unexpected event format:`, event.substring(0, 50));
                continue;
              }
              
              const data = event.substring(6).trim();
              
              // Handle special DONE marker
              if (data === '[DONE]') {
                console.log(`[${requestId}] Received [DONE] event`);
                continue;
              }
              
              try {
                // Parse the JSON data
                const parsedData = JSON.parse(data);
                
                // Check if the response contains an error object
                if (parsedData.error) {
                  console.error(`[${requestId}] Received error in stream:`, parsedData.error);
                  
                  // Create a proper error object with safe access to properties
                  let errorObj;
                  
                  if (typeof parsedData.error === 'string') {
                    errorObj = new Error(parsedData.error);
                  } else if (parsedData.error && typeof parsedData.error === 'object') {
                    errorObj = new Error(parsedData.error.message || 'Unknown error in stream');
                    
                    // Safely add additional properties
                    if (parsedData.error.code) errorObj.code = parsedData.error.code;
                    if (parsedData.error.requestId) errorObj.requestId = parsedData.error.requestId;
                  } else {
                    errorObj = new Error('Unknown error in stream');
                  }
                  
                  // Add request ID for debugging
                  errorObj.clientRequestId = requestId;
                  
                  if (onStreamError) {
                    onStreamError(errorObj);
                  }
                  return; // Skip processing this chunk further
                }
                
                // Process normal content chunk
                if (parsedData.content) {
                  const contentChunk = parsedData.content;
                  console.log(`[${requestId}] Parsed content chunk: ${contentChunk.substring(0, 30)}...`);
                  accumulatedContent += contentChunk;
                  
                  if (onStreamChunk) {
                    // Ensure we're calling the callback with the content chunk
                    onStreamChunk(contentChunk);
                  }
                } else if (parsedData.choices && parsedData.choices[0]) {
                  // Handle OpenAI/Claude format
                  let contentChunk = '';
                  
                  if (parsedData.choices[0].delta && parsedData.choices[0].delta.content) {
                    contentChunk = parsedData.choices[0].delta.content;
                  } else if (parsedData.choices[0].message && parsedData.choices[0].message.content) {
                    contentChunk = parsedData.choices[0].message.content;
                  } else if (parsedData.choices[0].text) {
                    contentChunk = parsedData.choices[0].text;
                  }
                  
                  if (contentChunk) {
                    console.log(`[${requestId}] Parsed content from choices: ${contentChunk.substring(0, 30)}...`);
                    accumulatedContent += contentChunk;
                    
                    if (onStreamChunk) {
                      onStreamChunk(contentChunk);
                    }
                  } else {
                    console.warn(`[${requestId}] Received choices without content:`, parsedData.choices[0]);
                  }
                } else {
                  console.warn(`[${requestId}] Received chunk without content property:`, parsedData);
                }
              } catch (parseError) {
                console.error(`[${requestId}] Error parsing stream chunk:`, parseError);
                console.error(`[${requestId}] Raw chunk data:`, data.substring(0, 100));
                
                // Check if it's HTML instead of JSON
                if (data.includes('<!DOCTYPE') || data.includes('<html')) {
                  const htmlError = new Error('Received HTML instead of JSON in stream');
                  if (onStreamError) onStreamError(htmlError);
                }
              }
            }
          }
        } catch (streamError) {
          // Safely log the error
          console.error(`[${requestId}] Stream processing error:`, streamError ? streamError : 'Unknown stream error');
          
          // Create a proper error object with safe access to properties
          let safeError;
          
          if (streamError && typeof streamError === 'object') {
            safeError = new Error(streamError.message || 'Error processing stream');
            // Copy any additional properties
            Object.keys(streamError).forEach(key => {
              if (key !== 'message') {
                safeError[key] = streamError[key];
              }
            });
          } else if (typeof streamError === 'string') {
            safeError = new Error(streamError);
          } else {
            safeError = new Error('Unknown error during stream processing');
          }
          
          // Add request ID for debugging
          safeError.clientRequestId = requestId;
          
          if (onStreamError) onStreamError(safeError);
        }
      })();
      
      // Return the controller so the caller can abort if needed
      return controller;
    }
    
    // Handle regular (non-streaming) responses
    try {
      const data = await response.json();
      console.log(`[${requestId}] Received successful response from Claude API`);
      return data;
    } catch (parseError) {
      console.error(`[${requestId}] Error parsing response:`, parseError);
      const responseText = await response.text();
      throw new Error(`Failed to parse API response: ${parseError.message}. Raw: ${responseText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('Error sending message to Claude API:', error);
    throw error;
  }
}
