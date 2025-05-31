import express from 'express';
import { ClaudeOpus } from './claude.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Initialize Claude client
const claude = new ClaudeOpus();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../web/dist');

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Middleware
app.use(express.json());

// Check if web build exists
const webBuildExists = fs.existsSync(distPath);
if (webBuildExists) {
  console.log('Web build detected, serving static files from:', distPath);
  app.use(express.static(distPath));
} else {
  console.warn('Web build not found at:', distPath);
  console.warn('Run "npm run build" to create the web build');
}

// Code optimization endpoint
app.post('/api/code/optimize', async (req, res) => {
  try {
    const { code, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    console.log(`Received code optimization request for ${language || 'unspecified'} language`);
    
    // Create a specialized system prompt for code optimization
    const systemPrompt = `You are an expert software engineer specializing in code optimization. 
    Analyze the provided ${language || ''} code and suggest optimizations for:
    1. Performance - improve time and space complexity
    2. Readability - enhance code clarity and maintainability
    3. Best practices - follow language-specific conventions and patterns
    4. Edge cases - handle potential errors and edge conditions
    
    Provide your response as optimized code with comments explaining the changes and improvements made.`;
    
    const response = await claude.createCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: code }
      ],
      temperature: 0.3, // Lower temperature for more precise code optimization
      max_tokens: 4096
    });
    
    return res.json({
      optimized_code: response.choices[0].message.content,
      model: response.model,
      usage: response.usage
    });
  } catch (error) {
    console.error('Error processing code optimization request:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
});

// Code explanation endpoint
app.post('/api/code/explain', async (req, res) => {
  try {
    const { code, language, detail_level } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    console.log(`Received code explanation request for ${language || 'unspecified'} language`);
    
    // Create a specialized system prompt for code explanation
    const systemPrompt = `You are an expert software engineer and educator. 
    Explain the provided ${language || ''} code with ${detail_level || 'moderate'} detail level.
    Break down the code's purpose, functionality, algorithms, and design patterns.
    Highlight any notable techniques, potential issues, or areas for improvement.
    Your explanation should be clear, thorough, and technically precise.`;
    
    const response = await claude.createCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: code }
      ],
      temperature: 0.5,
      max_tokens: 4096
    });
    
    return res.json({
      explanation: response.choices[0].message.content,
      model: response.model,
      usage: response.usage
    });
  } catch (error) {
    console.error('Error processing code explanation request:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
});

// Code generation endpoint with test cases
app.post('/api/code/generate', async (req, res) => {
  try {
    const { prompt, language, include_tests } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    console.log(`Received code generation request for ${language || 'unspecified'} language`);
    
    // Create a specialized system prompt for code generation
    const systemPrompt = `You are an expert software engineer specializing in ${language || 'multiple programming languages'}.
    Generate production-ready, efficient, and well-documented code based on the requirements.
    Follow best practices for ${language || 'the appropriate'} language.
    ${include_tests ? 'Include comprehensive test cases that cover edge cases and typical usage scenarios.' : ''}
    Prioritize:
    1. Correctness - the code must work as specified
    2. Performance - optimize for time and space efficiency
    3. Readability - write clear, maintainable code
    4. Error handling - handle potential errors and edge cases
    5. Documentation - include clear comments and documentation`;
    
    const response = await claude.createCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 4096
    });
    
    return res.json({
      generated_code: response.choices[0].message.content,
      model: response.model,
      usage: response.usage
    });
  } catch (error) {
    console.error('Error processing code generation request:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
});

// API endpoint for chat completions
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    console.log(`Received chat request with ${messages.length} messages`);
    
    const response = await claude.createCompletion({
      messages,
      temperature: 0.7,
      max_tokens: 4096
    });
    
    return res.json({
      message: response.choices[0].message.content,
      model: response.model,
      usage: response.usage
    });
  } catch (error) {
    console.error('Error processing chat request:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
});

// API endpoint for streaming chat completions
app.post('/api/chat/stream', async (req, res) => {
  console.log('Received streaming chat request');
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
  
  // Flush headers to establish SSE connection
  res.flushHeaders();
  
  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    console.error('Invalid request: messages array is required');
    res.write(`data: ${JSON.stringify({ type: 'error', details: 'Invalid request: messages array is required' })}\n\n`);
    res.end();
    return;
  }
  
  console.log(`Processing streaming request with ${messages.length} messages`);
  
  // Send an initial connection acknowledgment
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  
  try {
    // Create a unique request ID for tracing
    const requestId = req.query.requestId || uuidv4();
    console.log(`Request ID: ${requestId}`);
    
    // Check if API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('API key is missing');
      res.write(`data: ${JSON.stringify({ type: 'error', details: 'API key is missing' })}\n\n`);
      res.end();
      return;
    }
    
    // Create Claude instance
    const claude = new ClaudeOpus({
      apiKey: process.env.OPENROUTER_API_KEY,
      modelId: process.env.DEFAULT_MODEL_ID || 'anthropic/claude-3-opus-20240229',
      defaultSystemPrompt: process.env.DEFAULT_SYSTEM_PROMPT
    });
    
    // Prepare request parameters
    const requestParams = {
      messages: messages,
      model: process.env.DEFAULT_MODEL_ID || 'anthropic/claude-3-opus-20240229',
      stream: true,
      temperature: 0.7,
      max_tokens: 4000
    };
    
    console.log('Using model:', requestParams.model);
    
    // Add system prompt if not already present
    if (!messages.some(msg => msg.role === 'system')) {
      requestParams.messages.unshift({
        role: 'system',
        content: process.env.DEFAULT_SYSTEM_PROMPT || 'You are Claude, a helpful AI assistant.'
      });
    }
    
    console.log(`Streaming request to model: ${claude.modelId}`);
    
    // Keep the connection alive with periodic heartbeats
    const heartbeatInterval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
    }, 15000); // Send heartbeat every 15 seconds
    
    // Stream the completion
    await claude.streamCompletion(
      requestParams,
      (chunk) => {
        // Send each chunk to the client
        if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
          const content = chunk.choices[0].delta.content;
          res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
        }
      },
      requestId
    );
    
    // Clear the heartbeat interval
    clearInterval(heartbeatInterval);
    
    // Signal completion
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
    
  } catch (error) {
    console.error('Error in streaming completion:', error);
    
    // Send detailed error to client
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      details: error.message || 'An error occurred during streaming',
      timestamp: Date.now()
    })}\n\n`);
    
    // Ensure the connection is properly closed
    res.end();
  }
});

// GET endpoint for establishing SSE connection
app.get('/api/chat/stream', (req, res) => {
  console.log('SSE connection established');
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Flush headers to establish SSE connection
  res.flushHeaders();
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);
  
  // Keep connection alive with heartbeats
  const heartbeatInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
  }, 15000);
  
  // Handle client disconnect
  req.on('close', () => {
    console.log('SSE connection closed');
    clearInterval(heartbeatInterval);
  });
});

// Serve the React app for any other routes
app.get('*', (req, res) => {
  if (webBuildExists) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(200).send(`
      <html>
        <head>
          <title>Claude Opus 4 API</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 2rem; }
            pre { background: #f1f1f1; padding: 1rem; border-radius: 4px; overflow: auto; }
            code { font-family: monospace; }
            .container { display: flex; flex-direction: column; gap: 1rem; }
            h1 { color: #5436DA; }
            .endpoint { background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
            .endpoint h3 { margin-top: 0; }
          </style>
        </head>
        <body>
          <h1>Claude Opus 4 API</h1>
          <p>The API server is running, but the web UI has not been built yet.</p>
          <p>To build the web UI, run: <code>npm run build</code></p>
          
          <h2>Available API Endpoints:</h2>
          
          <div class="endpoint">
            <h3>POST /api/chat</h3>
            <p>Send a non-streaming chat request to Claude Opus 4</p>
            <pre><code>{
  "messages": [
    { "role": "system", "content": "You are Claude, an AI assistant." },
    { "role": "user", "content": "Hello, Claude!" }
  ]
}</code></pre>
          </div>
          
          <div class="endpoint">
            <h3>POST /api/chat/stream</h3>
            <p>Send a streaming chat request to Claude Opus 4</p>
            <p>This endpoint uses server-sent events (SSE) for streaming responses.</p>
            <pre><code>{
  "messages": [
    { "role": "system", "content": "You are Claude, an AI assistant." },
    { "role": "user", "content": "Hello, Claude!" }
  ]
}</code></pre>
          </div>
        </body>
      </html>
    `);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
