# OpenRouter Wrapper

Claude AI chat interface using OpenRouter - built with **Bun + Hono + React**.

## Features

- 🚀 **Fast**: Bun runtime + Hono framework
- 💬 **Streaming**: Real-time SSE streaming responses
- 📝 **Markdown**: Full markdown with syntax highlighting
- 💾 **Persistent**: PostgreSQL conversation storage
- 🎨 **Dark Mode**: Modern dark theme UI

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and OPENROUTER_API_KEY

# Run database migration
bun run migrate

# Build frontend
bun run build

# Start server
bun run dev
```

Open <http://localhost:3001>

## Project Structure

```text
openrouter-wrapper/
├── src/
│   ├── server.ts       # Hono API server
│   ├── migrate.ts      # Database migration
│   ├── App.jsx         # React app
│   ├── main.jsx        # React entry
│   ├── index.css       # Tailwind styles
│   ├── components/     # React components
│   └── lib/            # API client
├── dist/               # Built frontend
├── public/             # Static assets
├── index.html          # HTML template
├── package.json
├── vite.config.js
├── tailwind.config.js
└── .env
```

## Scripts

| Command | Description |
| ------- | ----------- |
| `bun run dev` | Start server with hot reload |
| `bun run build` | Build frontend |
| `bun run migrate` | Run database migrations |
| `bun run dev:vite` | Vite dev server (HMR) |

## Environment Variables

```env
OPENROUTER_API_KEY=your_api_key
DATABASE_URL=postgresql://user:pass@host:5432/db
PORT=3001
DEFAULT_MODEL_ID=anthropic/claude-opus-4
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/messages` - Add message
- `POST /api/chat/completions` - Chat with Claude (streaming)

## Database Schema

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  model_id VARCHAR(100),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT,
  created_at TIMESTAMPTZ
);
```

## License

MIT
