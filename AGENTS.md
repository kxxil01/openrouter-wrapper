# OpenRouter Chat Wrapper - Development Log

## Completed Features

### Authentication & Security
- [x] Google OAuth 2.0 SSO integration
- [x] Session-based authentication with secure cookies
- [x] User data persistence (PostgreSQL)
- [x] Session management with expiration

### Database Architecture
- [x] PostgreSQL with optimized schema
- [x] UUIDv7 for time-ordered primary keys (better index performance)
- [x] Modular migration system (`src/migrations/`)
- [x] Automatic `updated_at` triggers
- [x] Composite indexes for common queries

### Chat Features
- [x] Multi-model support via OpenRouter API
- [x] Streaming responses with SSE
- [x] Conversation persistence
- [x] Message history per conversation
- [x] **Auto-generated chat titles** (at 1, 3, 5 messages using Gemini)

### Monetization
- [x] Free tier with 5 messages/day limit
- [x] Paywall modal when limit reached
- [x] Daily message count reset at midnight UTC
- [x] Subscription status tracking (`free`, `active`, `cancelled`, `expired`)
- [x] Message not saved to DB when paywall blocks

### UI/UX
- [x] Modern ChatGPT-like interface
- [x] Sidebar with conversation history
- [x] Model selector dropdown
- [x] Markdown rendering with syntax highlighting
- [x] Math/LaTeX support (KaTeX)
- [x] Responsive design

### Developer Experience
- [x] Precommit hooks (format, lint, typecheck, build)
- [x] Prettier + ESLint configuration
- [x] TypeScript strict mode
- [x] Hot reload development server

---

## Roadmap

### Phase 1: Core Enhancements ✅
- [x] **Conversation search** - Full-text search across messages (Cmd+K)
- [x] **Export conversations** - Download as Markdown/JSON
- [x] **Keyboard shortcuts** - Cmd+K search, Cmd+/ sidebar, Cmd+Shift+N new chat
- [x] **Message editing** - Edit sent messages and regenerate response
- [x] **Regenerate response** - Re-run last assistant response

### Phase 2: Advanced Features
- [ ] **System prompts** - Custom instructions per conversation
- [ ] **Conversation folders** - Organize chats into categories
- [ ] **Shared conversations** - Public links to share chats
- [ ] **Image upload** - Vision model support (GPT-4V, Claude 3)
- [ ] **File attachments** - PDF/document analysis

### Phase 3: Collaboration
- [ ] **Team workspaces** - Shared conversations within organization
- [ ] **API keys management** - User-provided OpenRouter keys
- [ ] **Usage analytics** - Token usage, cost tracking
- [ ] **Admin dashboard** - User management, billing overview

### Phase 4: AI Enhancements
- [ ] **RAG integration** - Upload documents for context
- [ ] **Memory system** - Long-term user preferences
- [ ] **Agent mode** - Multi-step reasoning with tools
- [ ] **Code execution** - Run Python/JS in sandbox
- [ ] **Web browsing** - Real-time web search integration

### Phase 5: Platform
- [ ] **Mobile app** - React Native or PWA
- [ ] **Browser extension** - Quick access from any page
- [ ] **Slack/Discord bot** - Chat integration
- [ ] **API access** - Developer API for integrations
- [ ] **Webhooks** - Event notifications

---

## Suggested Next Features (Priority)

### 1. Conversation Search (High Impact, Medium Effort)
Allow users to search through all their conversations. Implement with PostgreSQL full-text search:
```sql
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));
```

### 2. Message Editing (High Impact, Low Effort)
Let users edit their messages and regenerate AI responses. Already have `deleteMessagesAfter` API - just need UI.

### 3. System Prompts (High Impact, Medium Effort)
Add `system_prompt` column to conversations table. Let users set custom instructions like "You are a helpful coding assistant".

### 4. Export Conversations (Medium Impact, Low Effort)
Add download button to export conversation as:
- Markdown file
- JSON (for backup/import)
- PDF (for sharing)

### 5. Keyboard Shortcuts (Medium Impact, Low Effort)
- `Cmd+K` / `Ctrl+K` - New conversation
- `Cmd+/` - Toggle sidebar
- `Cmd+Shift+C` - Copy last response
- `Escape` - Cancel streaming

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | Hono (Bun runtime) |
| Database | PostgreSQL |
| Auth | Google OAuth 2.0 |
| AI | OpenRouter API |
| Deployment | Bun |

---

## File Structure

```
src/
├── server.ts           # Main API server
├── migrate.ts          # Migration runner
├── migrations/         # Modular database migrations
│   ├── 001_uuid_v7_function.ts
│   ├── 002_users_table.ts
│   ├── 003_sessions_table.ts
│   ├── 004_conversations_table.ts
│   ├── 005_messages_table.ts
│   ├── 006_triggers.ts
│   ├── 007_user_preferences_table.ts
│   └── 008_cleanup.ts
├── lib/
│   ├── auth.ts         # Authentication utilities
│   └── api/            # Frontend API client
├── components/         # React components
└── hooks/              # Custom React hooks
```

---

*Last updated: December 25, 2024*
