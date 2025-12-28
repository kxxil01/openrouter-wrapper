# OpenRouter Wrapper

AI chat interface using OpenRouter API - built with **Bun + Hono + React**.

## Features

### Core
- **Google OAuth** - Secure authentication with Redis-backed sessions
- **Streaming** - Real-time SSE streaming responses
- **Markdown** - Full markdown with syntax highlighting + KaTeX math
- **Search** - Full-text search across conversations (Cmd+K)
- **Edit & Regenerate** - Edit messages and regenerate responses
- **Export** - Download conversations as Markdown/JSON
- **Keyboard Shortcuts** - Cmd+K search, Cmd+/ sidebar, Cmd+Shift+N new chat

### Collaboration
- **Team Workspaces** - Shared conversations within organizations
- **Admin Dashboard** - User management, bulk actions, activity analytics
- **Role-based Access** - User, Admin, Superadmin permissions

### Monetization
- **Stripe Billing** - Subscription checkout and management
- **Free Tier** - 5 messages/day with paywall
- **Usage Analytics** - Token usage and cost tracking

### Infrastructure
- **PostgreSQL** - UUIDv7 for time-ordered IDs, 21 migrations
- **Redis** - Session management, rate limiting, caching
- **BullMQ** - Background job processing for webhooks

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
├── server.ts              # Main Hono server
├── migrate.ts             # Database migration runner
├── routes/                # API route modules
│   ├── admin.ts           # Admin dashboard API
│   ├── auth.ts            # Login, logout, OAuth callback
│   ├── billing.ts         # Stripe billing routes
│   ├── chat.ts            # Chat completions (streaming)
│   ├── conversations.ts   # CRUD, export, messages
│   ├── teams.ts           # Team management
│   └── ...                # Other routes
├── migrations/            # Database migrations (001-021)
├── middleware/
│   └── rateLimit.ts       # Rate limiting middleware
├── lib/
│   ├── auth.ts            # Google OAuth utilities
│   ├── db.ts              # PostgreSQL connection
│   ├── redis.ts           # Redis client
│   ├── queue.ts           # BullMQ job queue
│   ├── stripe.ts          # Stripe client
│   ├── email.ts           # Resend email service
│   └── api/               # Frontend API client
├── components/            # React components
├── hooks/                 # Custom React hooks
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
REDIS_URL=redis://localhost:6379

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe Billing
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (Resend)
RESEND_API_KEY=re_xxx

# Optional
PORT=3001
DEFAULT_MODEL_ID=deepseek/deepseek-r1-0528:free
DISABLE_PAYWALL=true
```

## API Endpoints

### Health

- `GET /api/health` - Health check

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

### Teams

- `GET /api/teams` - List user teams
- `POST /api/teams` - Create team
- `POST /api/teams/:id/invite` - Invite member
- `POST /api/teams/join/:token` - Join via invite

### Admin (superadmin only)

- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List users (cursor pagination)
- `POST /api/admin/users/bulk` - Bulk actions
- `GET /api/admin/users/export` - Export users (CSV/JSON)
- `GET /api/admin/activity` - Activity analytics

### Billing

- `POST /api/billing/checkout` - Create Stripe checkout
- `POST /api/billing/portal` - Customer portal session
- `GET /api/billing/subscription` - Get subscription status

## Tech Stack

| Layer    | Technology                    |
| -------- | ----------------------------- |
| Runtime  | Bun                           |
| Backend  | Hono                          |
| Frontend | React 18, Vite, TailwindCSS   |
| Database | PostgreSQL                    |
| Cache    | Redis                         |
| Queue    | BullMQ                        |
| Auth     | Google OAuth 2.0              |
| Payments | Stripe                        |
| Email    | Resend                        |
| AI       | OpenRouter API                |

## License

MIT
