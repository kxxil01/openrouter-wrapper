# Claude Opus 4 Wrapper with UI

A production-ready JavaScript wrapper for Claude Opus 4 using the OpenRouter API, with a modern React-based web UI. This project includes a complete solution for interacting with Claude Opus 4, featuring streaming responses, automatic retries, and robust error handling.

## Features

### API Wrapper
- ✅ Full support for Claude Opus 4 via OpenRouter
- ✅ Streaming support with progress callbacks
- ✅ Automatic retries with exponential backoff
- ✅ Comprehensive error handling
- ✅ Detailed logging with request IDs
- ✅ TypeScript-friendly (though written in pure JavaScript)

### Web UI
- ✅ Modern, responsive React interface
- ✅ Real-time streaming responses
- ✅ Multi-conversation support
- ✅ Markdown and code syntax highlighting
- ✅ Conversation management (create, rename, delete)
- ✅ Typing indicators and loading states

## Quick Start

The easiest way to get started is to use the provided setup script:

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-opus-wrapper.git
cd claude-opus-wrapper

# Run the setup script
./setup.sh

# Start the application
npm start
```

Then open your browser to http://localhost:3001

## Manual Installation

```bash
# Install main dependencies
npm install

# Install web UI dependencies
cd web && npm install && cd ..
```

## Configuration

Create a `.env` file based on the provided `.env.example`:

```bash
cp .env.example .env
```

Then edit the `.env` file to add your OpenRouter API key:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

## Building and Running

```bash
# Build the web UI
npm run build

# Start the server
npm start
```

## Development

To run the application in development mode with hot reloading:

```bash
npm run dev
```

This will start both the API server and the web UI development server.

## Usage

### Basic Usage

```javascript
import { ClaudeOpus } from './src/index.js';

// Create a client instance
const claude = new ClaudeOpus({
  apiKey: 'your_openrouter_api_key', // Optional if set in .env
  modelId: 'anthropic/claude-3-opus-20240229', // Optional, this is the default
  timeout: 60000, // Optional, default is 60 seconds
  maxRetries: 3, // Optional, default is 3
  defaultSystemPrompt: 'You are Claude, a helpful AI assistant.' // Optional
});

// Send a completion request
async function getCompletion() {
  try {
    const response = await claude.createCompletion({
      messages: [
        { role: 'user', content: 'Explain quantum computing in simple terms.' }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getCompletion();
```

### Streaming Responses

```javascript
import { ClaudeOpus } from './src/index.js';

const claude = new ClaudeOpus();

async function streamCompletion() {
  try {
    let fullResponse = '';
    
    const response = await claude.createCompletion({
      messages: [
        { role: 'user', content: 'Write a short poem about programming.' }
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
      onProgress: (chunk, aggregated) => {
        // Get the new content delta
        const newContent = chunk.choices[0]?.delta?.content || '';
        if (newContent) {
          process.stdout.write(newContent);
          fullResponse += newContent;
        }
      }
    });
    
    console.log('\n\nFull response:', fullResponse);
    console.log('Token usage:', response.usage);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

streamCompletion();
```

### Using System Prompts

```javascript
import { ClaudeOpus } from './src/index.js';

const claude = new ClaudeOpus();

async function completionWithSystemPrompt() {
  try {
    const response = await claude.createCompletion({
      messages: [
        { 
          role: 'system', 
          content: 'You are a senior software engineer specializing in JavaScript. Provide code examples when relevant.' 
        },
        { 
          role: 'user', 
          content: 'How would you implement a debounce function?' 
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });
    
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

completionWithSystemPrompt();
```

## Web UI

The project includes a modern web UI built with React and Tailwind CSS that provides a user-friendly interface for interacting with Claude Opus 4, optimized for coding and deep thinking tasks.

### Features

- **Streaming Responses**: See Claude's responses appear in real-time with typing indicators
- **Multiple Conversations**: Create, manage, and switch between different conversations
- **Enhanced Markdown Support**: Full markdown rendering with GitHub-flavored markdown
- **Advanced Code Handling**:
  - Syntax highlighting for 100+ programming languages
  - Line numbers for better code readability
  - One-click code copying functionality
  - Automatic language detection and labeling
- **Mathematical Notation**: Full support for LaTeX math expressions via KaTeX
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Graceful handling of API errors with user-friendly messages

### Architecture

The web UI is built with:

- **React 18**: For the UI components and state management
- **Vite**: For fast development and optimized builds
- **Tailwind CSS**: For styling with a utility-first approach
- **Express.js**: For the backend API server
- **Server-Sent Events (SSE)**: For streaming responses from the API

### API Endpoints

The server exposes the following API endpoints:

#### General Chat
- **POST /api/chat**: Send a non-streaming chat request to Claude Opus 4
- **POST /api/chat/stream**: Send a streaming chat request to Claude Opus 4 (using SSE)

#### Specialized Coding Endpoints
- **POST /api/code/optimize**: Optimize code with detailed improvements
  ```json
  {
    "code": "function fibonacci(n) { if (n <= 1) return n; return fibonacci(n-1) + fibonacci(n-2); }",
    "language": "javascript"
  }
  ```

- **POST /api/code/explain**: Get detailed explanation of code functionality
  ```json
  {
    "code": "const memoize = fn => { const cache = {}; return (...args) => { const key = JSON.stringify(args); return cache[key] = cache[key] || fn(...args); }; };",
    "language": "javascript",
    "detail_level": "high" // optional: "low", "moderate", "high"
  }
  ```

- **POST /api/code/generate**: Generate production-ready code from requirements
  ```json
  {
    "prompt": "Create a React hook that debounces input values with TypeScript support",
    "language": "typescript",
    "include_tests": true // optional
  }
  ```

## API Reference

### `ClaudeOpus` Class

#### Constructor Options

```javascript
const claude = new ClaudeOpus({
  apiKey: string,           // OpenRouter API key
  modelId: string,          // Model ID (default: 'anthropic/claude-3-opus-20240229')
  timeout: number,          // Request timeout in ms (default: 60000)
  maxRetries: number,       // Maximum retries for failed requests (default: 3)
  retryDelay: number,       // Base delay between retries in ms (default: 1000)
  defaultSystemPrompt: string // Default system prompt to use when none provided
});
```

#### Methods

##### `createCompletion(params)`

Sends a completion request to Claude Opus via OpenRouter.

Parameters:
- `params.messages`: Array of message objects with `role` and `content` (required)
- `params.temperature`: Temperature for sampling (default: 0.7)
- `params.max_tokens`: Maximum tokens to generate (default: 4096)
- `params.stream`: Whether to stream the response (default: false)
- `params.onProgress`: Callback for streaming progress (required if `stream` is true)
- `params.top_p`: Top-p sampling parameter (optional)
- `params.top_k`: Top-k sampling parameter (optional)
- `params.stop`: Array of stop sequences (optional)
- `params.presence_penalty`: Presence penalty (optional)
- `params.frequency_penalty`: Frequency penalty (optional)

Returns: Promise resolving to the completion response object.

## Error Handling

The wrapper includes comprehensive error handling with automatic retries for transient errors:

- Network errors are automatically retried
- Rate limit errors (429) are automatically retried
- Server errors (5xx) are automatically retried
- Client errors (4xx) are not retried (except 429)

Errors include detailed information to help with debugging.

## Testing

Run the tests with:

```bash
npm test
```

Note: Some tests require a valid OpenRouter API key to run. These tests are commented out by default.

## License

MIT
