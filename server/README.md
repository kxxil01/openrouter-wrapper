# Unified Claude Chat Server

A production-ready server that combines Claude API integration with PostgreSQL database operations for chat history persistence.

## Features

- Direct PostgreSQL connection to Supabase for storing conversations and messages
- Claude API integration via OpenRouter
- RESTful API endpoints for conversation and message CRUD operations
- Streaming support for Claude API responses
- Environment validation and configuration
- Comprehensive error handling

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.sample` with your:
   - OpenRouter API key
   - PostgreSQL connection string
   - Other configuration options

## Environment Variables

- `OPENROUTER_API_KEY`: Your OpenRouter API key for Claude access
- `DATABASE_URL`: PostgreSQL connection string for Supabase
- `DEFAULT_MODEL_ID`: Default Claude model to use (default: `anthropic/claude-opus-4`)
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)

## API Endpoints

### Conversations
- `GET /api/conversations`: Get all conversations
- `GET /api/conversations/:id`: Get a conversation by ID
- `POST /api/conversations`: Create a new conversation
- `PUT /api/conversations/:id`: Update a conversation
- `DELETE /api/conversations/:id`: Delete a conversation

### Messages
- `GET /api/messages/:conversationId`: Get all messages for a conversation
- `POST /api/messages`: Save a new message

### Claude API
- `POST /api/chat/completions`: Send messages to Claude API (supports streaming)

### Utility Endpoints
- `GET /api/health`: Health check endpoint
- `GET /api/env/check`: Environment configuration check

## Running the Server

Development mode:
```
npm run dev
```

Production mode:
```
npm start
```

## Frontend Integration

The server is designed to work with the React frontend in the `web` directory. In production mode, it will serve the built React app.

## Security

- API keys are kept secure on the server side
- PostgreSQL connection uses SSL
- CORS is enabled for frontend access
