# Claude Opus Wrapper with UI

A production-ready JavaScript wrapper for Claude Opus and other Anthropic Claude models using the OpenRouter API, with a modern React-based web UI. This project provides a complete solution for interacting with Claude models, featuring streaming responses, conversation management, and a clean, minimal interface.

## Features

- ✅ Support for Claude Opus, Sonnet, and other Anthropic models
- ✅ Real-time streaming responses
- ✅ Conversation history with persistent storage
- ✅ Multi-conversation management
- ✅ Modern, minimal UI design
- ✅ Mobile-friendly responsive interface
- ✅ Robust error handling and recovery

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- An OpenRouter API key with access to Claude models

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-opus-wrapper.git
cd claude-opus-wrapper

# Install dependencies for the server
npm install

# Install dependencies for the web client
cd web
npm install
cd ..
```

## Environment Setup

This application requires an `.env` file in the root directory with the following variables:

```
# API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
PORT=3001  # Optional, defaults to 3001

# Database Configuration
DATABASE_URL=sqlite:./data/conversations.db  # SQLite database path
# Or for PostgreSQL:
# DATABASE_URL=postgresql://username:password@localhost:5432/claude_conversations

# Optional Configuration
DEFAULT_MODEL=anthropic/claude-opus-4  # Default model to use
REQUEST_TIMEOUT=60000  # Timeout for API requests in ms
MAX_RETRIES=3  # Maximum number of retries for failed requests
```

**Important:** The `.env` file contains sensitive information and is excluded from version control via `.gitignore`. Never commit your `.env` file to a repository.

### Creating the .env file

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

## Running the Application

### Development Mode

Run the application in development mode with hot reloading:

```bash
npm run dev
```

This starts both the backend server and the web client in development mode:
- Backend API: http://localhost:3001
- Web Client: http://localhost:3000

### Production Mode

For production deployment:

```bash
# Build the web client
cd web
npm run build
cd ..

# Start the server in production mode
npm start
```

In production mode, the server will serve the static files from the built web client at http://localhost:3001.

## Usage

1. Open your browser and navigate to http://localhost:3000 (development) or http://localhost:3001 (production)
2. Create a new conversation by clicking the "New Chat" button
3. Enter your message and press Enter to send
4. View Claude's response in real-time as it streams

### Model Selection

You can switch between different Claude models using the model selector dropdown in the UI. Available models include:

- Claude Opus 4
- Claude Sonnet 4
- Claude 3.7 Sonnet
- (Other models available through your OpenRouter account)

## Architecture

This application consists of two main components:

### Backend Server

- Built with Express.js
- Handles API communication with OpenRouter
- Manages conversation persistence in a database
- Implements streaming responses with Server-Sent Events (SSE)

### Web Client

- Built with React and Vite
- Modern UI with Tailwind CSS
- Responsive design for desktop and mobile
- Real-time streaming message display

## Troubleshooting

### Port Conflicts

If you encounter a "Port already in use" error when starting the application, you may have another service running on the same port. You can:

1. Stop the other service using that port, or
2. Change the port in the `.env` file for the server and/or in the `vite.config.js` for the web client

### API Key Issues

If you encounter authentication errors, ensure:
1. Your OpenRouter API key is correct in the `.env` file
2. Your OpenRouter account has access to Claude models
3. You have sufficient credit in your OpenRouter account

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
