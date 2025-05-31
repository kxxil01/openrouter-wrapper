import express from 'express';
import cors from 'cors';
import { ClaudeOpus } from './src/claude.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');

console.log(`Loading environment variables from: ${envPath}`);
dotenv.config({ path: envPath });

// Check if API key is loaded
const apiKey = process.env.OPENROUTER_API_KEY;
console.log(`OPENROUTER_API_KEY exists: ${!!apiKey}`);
if (apiKey) {
  console.log(`API key length: ${apiKey.length}`);
  console.log(`First 5 chars: ${apiKey.substring(0, 5)}...`);
}

// Default model ID
const defaultModelId = process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4';

// Initialize Claude client
let claude;
try {
  claude = new ClaudeOpus({
    apiKey,
    modelId: defaultModelId
  });
  console.log('Claude client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Claude client:', error);
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request ID to each request
app.use((req, res, next) => {
  req.requestId = uuidv4();
  next();
});

// Request logging middleware with request ID
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// Check for static web build
const webDistPath = path.join(__dirname, 'web', 'dist');
const hasWebBuild = fs.existsSync(webDistPath) && fs.existsSync(path.join(webDistPath, 'index.html'));

if (hasWebBuild) {
  console.log(`Web build detected, serving static files from: ${webDistPath}`);
  app.use(express.static(webDistPath));
} else {
  console.log('No web build detected, serving API only');
}

// API Routes

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Claude Opus Wrapper API is running',
    endpoints: [
      '/api/env/check',
      '/api/env/check-simple',
      '/api/config/check',
      '/api/config/check-simple',
      '/api/chat/completions',
      '/api/test'
    ]
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  console.log(`[${req.requestId}] Test endpoint called`);
  res.status(200).json({ 
    status: 'success', 
    message: 'Server is working',
    timestamp: new Date().toISOString()
  });
});

// Environment check endpoint
app.get('/api/env/check', (req, res) => {
  console.log(`[${req.requestId}] Environment check endpoint called`);
  
  try {
    const envVars = {};
    
    // List all environment variables without showing sensitive values
    for (const key in process.env) {
      if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASSWORD')) {
        envVars[key] = process.env[key] ? `[REDACTED - Length: ${process.env[key].length}]` : 'undefined';
      } else {
        envVars[key] = process.env[key];
      }
    }
    
    // Check if .env file exists
    const envFileExists = fs.existsSync(envPath);
    console.log(`[${req.requestId}] Checking .env file at ${envPath}: ${envFileExists ? 'exists' : 'does not exist'}`);
    
    // Check for OPENROUTER_API_KEY specifically
    const hasApiKey = !!process.env.OPENROUTER_API_KEY;
    console.log(`[${req.requestId}] OPENROUTER_API_KEY exists: ${hasApiKey}`);
    if (hasApiKey) {
      console.log(`[${req.requestId}] OPENROUTER_API_KEY length: ${process.env.OPENROUTER_API_KEY.length}`);
    }
    
    return res.status(200).json({
      status: hasApiKey ? 'success' : 'error',
      envFileExists,
      hasApiKey,
      keyLength: hasApiKey ? process.env.OPENROUTER_API_KEY.length : 0,
      envVarCount: Object.keys(process.env).length
    });
  } catch (error) {
    console.error(`[${req.requestId}] Error in env check:`, error);
    return res.status(200).json({
      status: 'error',
      message: error.message
    });
  }
});

// Simplified environment check endpoint
app.get('/api/env/check-simple', (req, res) => {
  console.log(`[${req.requestId}] Simple environment check endpoint called`);
  
  try {
    // Check if .env file exists
    const envFileExists = fs.existsSync(envPath);
    
    // Check for OPENROUTER_API_KEY specifically
    const hasApiKey = !!process.env.OPENROUTER_API_KEY;
    const keyLength = hasApiKey ? process.env.OPENROUTER_API_KEY.length : 0;
    
    console.log(`[${req.requestId}] .env file exists: ${envFileExists}, API key exists: ${hasApiKey}, length: ${keyLength}`);
    
    return res.status(200).json({
      status: 'success',
      envFileExists,
      hasApiKey,
      keyLength
    });
  } catch (error) {
    console.error(`[${req.requestId}] Error in simple env check:`, error);
    return res.status(200).json({
      status: 'error',
      message: error.message
    });
  }
});

// API key check endpoint
app.get('/api/config/check', (req, res) => {
  console.log(`[${req.requestId}] API key check endpoint called`);
  
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const defaultModelId = process.env.DEFAULT_MODEL_ID || 'anthropic/claude-opus-4';
    
    if (!apiKey) {
      console.log(`[${req.requestId}] No API key found, returning error response`);
      return res.status(200).json({
        status: 'error',
        message: 'OpenRouter API key is not configured',
        configured: false
      });
    }
    
    // Only show first 5 characters of API key for security
    const maskedKey = apiKey ? `${apiKey.substring(0, 5)}...` : 'undefined';
    console.log(`[${req.requestId}] Using API key: ${maskedKey}`);
    
    // For now, just return success if we have an API key
    // We'll do the actual API validation in the chat completions endpoint
    return res.status(200).json({
      status: 'success',
      message: 'API key is configured',
      configured: true,
      keyLength: apiKey.length,
      maskedKey,
      defaultModelId,
      availableModels: {
        'anthropic/claude-opus-4': true,
        'anthropic/claude-sonnet-4': true,
        'anthropic/claude-3.7-sonnet': true
      },
      stableModels: [
        { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4' },
        { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
        { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet' }
      ]
    });
  } catch (error) {
    console.error(`[${req.requestId}] Error checking API key:`, error);
    return res.status(200).json({
      status: 'error',
      message: error.message || 'An error occurred checking API key',
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});

// Simplified API key check endpoint
app.get('/api/config/check-simple', (req, res) => {
  console.log(`[${req.requestId}] Simple API key check endpoint called`);
  
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const configured = !!apiKey;
    const keyLength = apiKey ? apiKey.length : 0;
    const maskedKey = apiKey ? `${apiKey.substring(0, 5)}...` : 'undefined';
    
    console.log(`[${req.requestId}] API key configured: ${configured}, length: ${keyLength}`);
    
    return res.status(200).json({
      status: 'success',
      configured,
      keyLength,
      maskedKey
    });
  } catch (error) {
    console.error(`[${req.requestId}] Error in simple API key check:`, error);
    return res.status(200).json({
      status: 'error',
      message: error.message
    });
  }
});

// Chat completions endpoint
app.post('/api/chat/completions', (req, res) => {
  console.log(`[${req.requestId}] Chat completions endpoint called`);
  
  try {
    const { messages, model, temperature, max_tokens, top_p, stream } = req.body;
    
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error(`[${req.requestId}] Invalid messages array:`, messages);
      return res.status(400).json({
        status: 'error',
        message: 'Messages array is required and must not be empty'
      });
    }
    
    console.log(`[${req.requestId}] Request parameters:`, {
      model: model || defaultModelId,
      temperature,
      max_tokens,
      top_p,
      stream: !!stream,
      messageCount: messages.length
    });
    
    // Make sure Claude client is initialized
    if (!claude) {
      console.error(`[${req.requestId}] Claude client is not initialized`);
      return res.status(500).json({
        status: 'error',
        message: 'Claude client is not initialized. Check API key configuration.'
      });
    }
    
    // Handle streaming response
    if (stream) {
      console.log(`[${req.requestId}] Streaming response requested`);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', requestId: req.requestId })}\n\n`);
      
      try {
        // Use the streamCompletion method with proper parameters
        claude.streamCompletion(messages, {
          modelId: model || defaultModelId,
          temperature: temperature !== undefined ? temperature : 0.7,
          maxTokens: max_tokens || 4000,
          topP: top_p !== undefined ? top_p : 0.9
        }, (chunk) => {
          // This callback will be called for each chunk of the response
          // Format the chunk as an SSE event
          if (chunk && typeof chunk === 'object') {
            const eventData = JSON.stringify({
              type: 'content',
              content: chunk.content || chunk.text || '',
              id: chunk.id || null
            });
            res.write(`data: ${eventData}\n\n`);
          }
        })
        .then((finalResponse) => {
          // This is called when streaming is complete
          console.log(`[${req.requestId}] Streaming response completed`);
          res.write('data: {"type":"done"}\n\n');
          res.write('data: [DONE]\n\n');
          res.end();
        })
        .catch(error => {
          console.error(`[${req.requestId}] Error during streaming:`, error);
          res.write(`data: ${JSON.stringify({ type: 'error', details: error.message })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        });
      } catch (error) {
        console.error(`[${req.requestId}] Error setting up streaming:`, error);
        res.write(`data: ${JSON.stringify({ type: 'error', details: error.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      // Handle non-streaming response
      console.log(`[${req.requestId}] Standard (non-streaming) response requested`);
      claude.createCompletion({
        messages,
        model: model || defaultModelId,
        temperature: temperature !== undefined ? temperature : 0.7,
        max_tokens: max_tokens || 4000,
        top_p: top_p !== undefined ? top_p : 0.9,
        stream: false
      })
      .then(response => {
        console.log(`[${req.requestId}] Response received from Claude client`);
        return res.json(response);
      })
      .catch(error => {
        console.error(`[${req.requestId}] Error creating completion:`, error);
        return res.status(500).json({
          status: 'error',
          message: error.message,
          error: {
            message: error.message,
            details: error.response?.data || 'No additional details available'
          }
        });
      });
    }
  } catch (error) {
    console.error(`[${req.requestId}] Unexpected error in chat completions endpoint:`, error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});

// Serve the React app for any other routes
app.get('*', (req, res) => {
  if (webBuildExists) {
    res.sendFile(path.join(webDistPath, 'index.html'));
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
          <div class="container">
            <div class="endpoint">
              <h3>API Endpoints:</h3>
              <ul>
                <li><code>/api</code> - API root</li>
                <li><code>/api/env/check</code> - Check environment variables</li>
                <li><code>/api/config/check</code> - Check API key configuration</li>
                <li><code>/api/chat/completions</code> - Claude chat completions</li>
                <li><code>/api/test</code> - Test endpoint</li>
              </ul>
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error(`[${req.requestId || 'no-id'}] Global error handler caught:`, err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
