import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClaudeOpus } from './claude.js';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';

// Setup dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root directory
try {
  const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });
  if (result.error) {
    console.warn('Warning: Could not load .env file from root directory:', result.error.message);
    console.log('Will use process environment variables only');
  } else {
    console.log('Successfully loaded environment variables from root .env file');
  }
} catch (error) {
  console.warn('Warning: Error loading .env file:', error.message);
  console.log('Will use process environment variables only');
}

// Initialize Claude client
const claudeClient = new ClaudeOpus({
  apiKey: process.env.OPENROUTER_API_KEY,
  modelId: process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4'
});

// Configure Express
const app = express();
// Explicitly read PORT from .env or use 3001 as default
const PORT = process.env.PORT || 3001;
console.log(`Using PORT: ${PORT} (from ${process.env.PORT ? '.env file' : 'default value'})`)

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../web/dist')));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all conversations
app.get('/api/conversations', async (req, res) => {
  try {
    console.log('Fetching all conversations...');
    const result = await db.query(
      'SELECT * FROM conversations ORDER BY updated_at DESC'
    );
    
    console.log(`Successfully fetched ${result.rows.length} conversations`);
    
    // Ensure we always return a valid array, even if empty
    const conversations = result.rows || [];
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(conversations));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    console.error('Error stack:', error.stack);
    
    // Ensure error response is always valid JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(500).send(JSON.stringify({ 
      error: 'Failed to fetch conversations', 
      message: error.message || 'Unknown server error' 
    }));
  }
});

// Create a new conversation
app.post('/api/conversations', async (req, res) => {
  try {
    console.log('Creating new conversation with body:', req.body);
    const { title, model_id } = req.body;
    const id = uuidv4();
    
    console.log(`Generated UUID: ${id}`);
    console.log(`Using title: ${title || 'New Conversation'}`);
    console.log(`Using model_id: ${model_id || process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4'}`);
    
    const result = await db.query(
      'INSERT INTO conversations (id, title, model_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [id, title || 'New Conversation', model_id || process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4']
    );
    
    console.log('Successfully created conversation:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating conversation:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create conversation', message: error.message });
  }
});

// Update a conversation
app.put('/api/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    const result = await db.query(
      'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [title, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete a conversation
app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete all messages in the conversation
    await db.query('DELETE FROM messages WHERE conversation_id = $1', [id]);
    
    // Then delete the conversation
    const result = await db.query('DELETE FROM conversations WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Add a message to a conversation
app.post('/api/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { role, content } = req.body;
  const messageId = uuidv4();
  
  if (!role || !content) {
    return res.status(400).json({ error: 'Role and content are required' });
  }
  
  if (role !== 'user' && role !== 'assistant' && role !== 'system') {
    return res.status(400).json({ error: 'Role must be user, assistant, or system' });
  }
  
  try {
    // Check if conversation exists
    const conversationResult = await db.query(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );
    
    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Insert message
    const result = await db.query(
      'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [messageId, id, role, content]
    );
    
    // Update conversation updated_at timestamp
    await db.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Get messages for a conversation (by path parameter)
app.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching messages for conversation: ${id}`);
    
    // Check if conversation exists
    const conversationCheck = await db.query(
      'SELECT id FROM conversations WHERE id = $1',
      [id]
    );
    
    if (conversationCheck.rows.length === 0) {
      console.log(`Conversation not found: ${id}`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).send(JSON.stringify({ error: 'Conversation not found' }));
    }
    
    const result = await db.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [id]
    );
    
    console.log(`Found ${result.rows.length} messages for conversation ${id}`);
    
    // Ensure we always return a valid array, even if empty
    const messages = result.rows || [];
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(messages));
  } catch (error) {
    console.error('Error fetching messages:', error);
    console.error('Error stack:', error.stack);
    
    // Ensure error response is always valid JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(500).send(JSON.stringify({ 
      error: 'Failed to fetch messages', 
      message: error.message || 'Unknown server error' 
    }));
  }
});

// Get messages for a conversation (by query parameter)
app.get('/api/messages', async (req, res) => {
  try {
    const { conversation_id } = req.query;
    
    if (!conversation_id) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    // Check if conversation exists
    const conversationResult = await db.query(
      'SELECT * FROM conversations WHERE id = $1',
      [conversation_id]
    );
    
    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const result = await db.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversation_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
  }
});

// Add a message to a conversation
app.post('/api/messages', async (req, res) => {
  try {
    const { conversation_id, role, content } = req.body;
    
    // Validate inputs
    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }
    
    if (!role || !['user', 'assistant', 'system'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (user, assistant, or system)' });
    }
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Valid content is required' });
    }
    
    // Check if conversation exists
    const conversationCheck = await db.query(
      'SELECT id FROM conversations WHERE id = $1',
      [conversation_id]
    );
    
    if (conversationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Create the message
    const messageId = uuidv4();
    
    const result = await db.query(
      'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [messageId, conversation_id, role, content]
    );
    
    // Update conversation timestamp
    await db.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversation_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message', details: error.message });
  }
});

// Claude API proxy endpoint
app.post('/api/chat/completions', async (req, res) => {
  const { messages, model, stream = false, conversation_id } = req.body;
  const requestId = uuidv4().substring(0, 8);
  
  console.log(`[${requestId}] Received Claude chat request, stream=${stream}`);
  
  // Validate request
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Valid messages array is required' });
  }
  
  try {
    // Handle streaming responses
    if (stream) {
      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      let fullContent = '';
      
      try {
        // Stream the response
        await claudeClient.streamCompletion({
          messages,
          model,
          stream: true,
          requestId,
          onProgress: (chunkContent) => {
            if (chunkContent) {
              console.log(`[${requestId}] Streaming chunk: ${chunkContent.substring(0, 30)}...`);
              
              // Format the chunk as a proper OpenAI-compatible delta format
              // This ensures compatibility with various clients
              const deltaFormat = {
                choices: [{
                  delta: { content: chunkContent },
                  index: 0,
                  finish_reason: null
                }],
                id: requestId,
                model: process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4',
                object: 'chat.completion.chunk'
              };
              
              // Send each chunk individually to the client
              res.write(`data: ${JSON.stringify(deltaFormat)}\n\n`);
              fullContent += chunkContent;
            }
          },
          onComplete: async (content) => {
            // Send final DONE event
            res.write('data: [DONE]\n\n');
            res.end();
            console.log(`[${requestId}] Stream completed with total content length: ${content.length}`);
            
            // Only save the complete assistant message to database when streaming is done
            let conversation_id = req.body.conversation_id;
            console.log(`Request includes conversation_id: ${conversation_id || 'none'}`);
            
            try {
              // If conversation_id is null, undefined, or empty string, create a new conversation
              if (!conversation_id) {
                console.log('No conversation_id provided, creating a new conversation');
                const id = uuidv4();
                const model_id = req.body.model || process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4';
                
                const result = await db.query(
                  'INSERT INTO conversations (id, title, model_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
                  [id, 'New Conversation', model_id],
                  { useTransaction: true }
                );
                
                conversation_id = id;
                console.log(`Created new conversation with id: ${conversation_id}`);
              }
              
              // Validate that we're using a valid role ('assistant')
              const validRoles = ['user', 'assistant', 'system'];
              const role = 'assistant';
              
              if (!validRoles.includes(role)) {
                throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
              }
              
              const messageId = uuidv4();
              console.log(`Saving assistant message with id=${messageId}, role=${role}, content length=${content.length}`);
              
              // First check if the conversation exists
              const conversationCheck = await db.query(
                'SELECT id FROM conversations WHERE id = $1',
                [conversation_id]
              );
              
              // If conversation doesn't exist, create it
              if (conversationCheck.rows.length === 0) {
                console.log(`Conversation ${conversation_id} not found in database, creating it first`);
                await db.query(
                  'INSERT INTO conversations (id, title, model_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
                  [conversation_id, 'New Conversation', process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4']
                );
              }
              
              try {
                // Use transaction for message insert and conversation update
                const result = await db.query(
                  'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
                  [messageId, conversation_id, role, content],
                  { useTransaction: true }
                );
                
                // Update conversation timestamp in same transaction
                await db.query(
                  'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
                  [conversation_id],
                  { useTransaction: true }
                );
                
                console.log('Successfully saved complete assistant response to database:', result.rows[0].id);
              } catch (dbError) {
                console.error('Database error while saving message:', dbError);
                throw dbError; // Re-throw to be caught by outer try/catch
              }
            } catch (error) {
              console.error('Error saving assistant response:', error);
              // We don't want to fail the whole request if saving to DB fails
              // But we'll log it thoroughly for debugging
              console.error('Full error details:', {
                message: error.message,
                stack: error.stack,
                conversation_id,
                query: error.query
              });
            }
          },
          onError: (error) => {
            console.error(`[${requestId}] Stream error:`, error);
            
            // Create a safe error object with only necessary properties
            const safeError = {
              message: error.message || 'Unknown streaming error',
              code: error.code || 'STREAM_ERROR',
              requestId: error.requestId || requestId
            };
            
            // Send the error to the client
            res.write(`data: ${JSON.stringify({ error: safeError })}\n\n`);
            res.end();
          }
        });
      } catch (streamError) {
        console.error(`[${requestId}] Streaming error:`, streamError);
        const safeError = {
          message: streamError.message || 'Unknown streaming error',
          code: streamError.code || 'STREAM_ERROR',
          requestId: streamError.requestId || requestId
        };
        res.write(`data: ${JSON.stringify({ error: safeError })}\n\n`);
        res.end();
      }
    } else {
      // Handle non-streaming responses
      const response = await claudeClient.createChatCompletion({
        messages,
        model,
        stream: false,
        requestId
      });
      
      console.log(`[${requestId}] Non-streaming response received`);
      
      // Save the assistant's response to the database
      if (response.choices && response.choices[0] && response.choices[0].message) {
        const assistantContent = response.choices[0].message.content;
        
        try {
          const messageId = uuidv4();
          console.log(`[${requestId}] Saving assistant message with id=${messageId}, content length=${assistantContent.length}`);
          
          // If conversation_id is null, undefined, or empty string, create a new conversation
          if (!conversation_id) {
            console.log(`[${requestId}] No conversation_id provided, creating a new conversation`);
            const id = uuidv4();
            const model_id = model || process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4';
            
            const result = await db.query(
              'INSERT INTO conversations (id, title, model_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
              [id, 'New Conversation', model_id],
              { useTransaction: true }
            );
            
            conversation_id = id;
            console.log(`[${requestId}] Created new conversation with id: ${conversation_id}`);
          } else {
            // First check if the conversation exists
            const conversationCheck = await db.query(
              'SELECT id FROM conversations WHERE id = $1',
              [conversation_id]
            );
            
            // If conversation doesn't exist, create it
            if (conversationCheck.rows.length === 0) {
              console.log(`[${requestId}] Conversation ${conversation_id} not found in database, creating it first`);
              await db.query(
                'INSERT INTO conversations (id, title, model_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
                [conversation_id, 'New Conversation', process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4']
              );
            }
          }
          
          // Use transaction for message insert and conversation update
          const result = await db.query(
            'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [messageId, conversation_id, 'assistant', assistantContent],
            { useTransaction: true }
          );
          
          // Update conversation timestamp in the same transaction
          await db.query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
            [conversation_id],
            { useTransaction: true }
          );
          
          console.log(`[${requestId}] Saved assistant response to database with id: ${result.rows[0].id}`);
        } catch (dbError) {
          console.error(`[${requestId}] Error saving assistant response:`, dbError);
          // Log detailed error information for debugging
          console.error('Full error details:', {
            message: dbError.message,
            stack: dbError.stack,
            conversation_id,
            requestId,
            query: dbError.query
          });
          // Continue with the response even if DB save fails
        }
      }
      
      res.json(response);
    }
  } catch (error) {
    console.error(`[${requestId}] Claude API error:`, error);
    
    // Create a detailed error object for logging
    const detailedError = {
      message: error.message || 'Failed to get response from Claude',
      code: error.code || 'CLAUDE_ERROR',
      requestId,
      stack: error.stack,
      name: error.name,
      status: error.status,
      statusText: error.statusText
    };
    
    console.error('Detailed error information:', detailedError);
    
    // Send a sanitized version to the client
    res.status(500).json({ 
      error: {
        message: error.message || 'Failed to get response from Claude',
        code: error.code || 'CLAUDE_ERROR',
        requestId,
        status: error.status
      }
    });
  }
});

// Catch-all route to serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/dist/index.html'));
});

// Wait for database connection before starting the server
db.connectionPromise
  .then(() => {
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  })
  .catch(error => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  });
