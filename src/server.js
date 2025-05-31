import express from 'express';
import { ClaudeOpus } from './claude.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Function to send SSE data
    const sendData = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // Stream the response
    await claude.createCompletion({
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
      onProgress: (chunk, aggregated) => {
        // Send the delta content
        if (chunk.choices && chunk.choices[0]?.delta?.content) {
          sendData({
            type: 'content',
            content: chunk.choices[0].delta.content
          });
        }
        
        // Send finish reason if present
        if (chunk.choices && chunk.choices[0]?.finish_reason) {
          sendData({
            type: 'finish',
            finish_reason: chunk.choices[0].finish_reason
          });
        }
      }
    });
    
    // End the stream
    sendData({ type: 'done' });
    res.end();
  } catch (error) {
    console.error('Error processing streaming chat request:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error',
      error: 'Failed to process request',
      details: error.message 
    })}\n\n`);
    res.end();
  }
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
