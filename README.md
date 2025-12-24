# OpenRouter Wrapper

AI chat interface using OpenRouter API - built with **Bun + Hono + React**.

## Features

- � **Google OAuth**: Secure authentication with session management
- 💬 **Streaming**: Real-time SSE streaming responses
- 📝 **Markdown**: Full markdown with syntax highlighting + KaTeX math
- � **Search**: Full-text search across conversations (Cmd+K)
- ✏️ **Edit & Regenerate**: Edit messages and regenerate responses
- 📤 **Export**: Download conversations as Markdown/JSON
- 💾 **Persistent**: PostgreSQL with UUIDv7 for time-ordered IDs
- 🎨 **Dark Mode**: Modern ChatGPT-like interface
- ⌨️ **Keyboard Shortcuts**: Cmd+K search, Cmd+/ sidebar, Cmd+Shift+N new chat
- 💰 **Paywall**: Free tier with 5 messages/day limit

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
bun run migrate

# Build frontend
bun run build

# Start server
bun run dev
```

Open <http://localhost:3001>

## Project Structure

```text
src/
├── server.ts              # Main Hono server (route mounting)
├── migrate.ts             # Database migration runner
├── routes/                # API route modules
│   ├── auth.ts            # Login, logout, OAuth callback
│   ├── conversations.ts   # CRUD, export, messages
│   ├── messages.ts        # Message operations
│   ├── chat.ts            # Chat completions (streaming)
│   ├── preferences.ts     # User preferences
│   ├── search.ts          # Full-text search
│   └── models.ts          # OpenRouter models
├── migrations/            # Database migrations (001-009)
├── lib/
│   ├── auth.ts            # Google OAuth utilities
│   ├── db.ts              # PostgreSQL connection
│   └── api/               # Frontend API client
├── components/            # React components
│   ├── ChatInterface.jsx
│   ├── MessageList.jsx
│   ├── Sidebar.jsx
│   ├── SearchModal.jsx
│   └── ...
├── hooks/                 # Custom React hooks
│   ├── useChat.js         # Chat logic
│   ├── useAuth.js
│   ├── useConversations.js
│   └── ...
├── App.jsx
└── main.jsx
```

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `bun run dev`        | Start server with hot reload   |
| `bun run build`      | Build frontend                 |
| `bun run migrate`    | Run database migrations        |
| `bun run precommit`  | Format, lint, typecheck, build |
| `bun run lint`       | ESLint check                   |
| `bun run format`     | Prettier format                |

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional - Google OAuth (enables authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional
PORT=3001
DEFAULT_MODEL_ID=deepseek/deepseek-r1-0528:free
DISABLE_PAYWALL=true
```

## API Endpoints

### Authentication

- `GET /auth/login` - Initiate Google OAuth
- `GET /auth/callback` - OAuth callback
- `GET /auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Conversations

- `GET /api/conversations` - List user conversations
- `POST /api/conversations` - Create conversation
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Add message
- `DELETE /api/conversations/:id/messages/after/:index` - Delete messages after index
- `POST /api/conversations/:id/generate-title` - Auto-generate title
- `GET /api/conversations/:id/export` - Export as Markdown/JSON

### Chat & Search

- `POST /api/chat/completions` - Chat with AI (streaming SSE)
- `GET /api/search?q=query` - Full-text search
- `GET /api/models` - List available models
- `GET /api/preferences` - Get user preferences
- `PATCH /api/preferences` - Update preferences

## Tech Stack

| Layer    | Technology                    |
| -------- | ----------------------------- |
| Runtime  | Bun                           |
| Backend  | Hono                          |
| Frontend | React 18, Vite, TailwindCSS   |
| Database | PostgreSQL                    |
| Auth     | Google OAuth 2.0              |
| AI       | OpenRouter API                |

## License

MIT
