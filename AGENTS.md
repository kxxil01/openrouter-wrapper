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
- [x] Performance indexes for high-traffic optimization

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
- [x] Stripe billing integration with checkout
- [x] Subscription tiers (Individual, Team, Organization)
- [x] Billing portal for subscription management

### UI/UX

- [x] Modern ChatGPT-like interface
- [x] Sidebar with conversation history
- [x] Model selector dropdown
- [x] Markdown rendering with syntax highlighting
- [x] Math/LaTeX support (KaTeX)
- [x] Responsive design
- [x] Pricing modal with plan comparison

### Developer Experience

- [x] Precommit hooks (format, lint, typecheck, build)
- [x] Prettier + ESLint configuration
- [x] TypeScript strict mode
- [x] Hot reload development server
- [x] Centralized configuration (`src/lib/config.ts`)

---

## Roadmap

### Phase 1: Core Enhancements ✅

- [x] **Conversation search** - Full-text search across messages (Cmd+K)
- [x] **Export conversations** - Download as Markdown/JSON
- [x] **Keyboard shortcuts** - Cmd+K search, Cmd+/ sidebar, Cmd+Shift+N new chat
- [x] **Message editing** - Edit sent messages and regenerate response
- [x] **Regenerate response** - Re-run last assistant response

### Phase 2: Advanced Features ✅

- [x] **System prompts** - Custom instructions per conversation
- [x] **Conversation folders** - Organize chats into categories
- [x] **Shared conversations** - Public links to share chats
- [x] **Image upload** - Vision model support (GPT-4V, Claude 3)
- [x] **File attachments** - PDF/document analysis

### Phase 3: Collaboration ✅

- [x] **Team workspaces** - Shared conversations within organization
- [x] **API keys management** - User-provided OpenRouter keys
- [x] **Usage analytics** - Token usage, cost tracking
- [x] **Admin dashboard** - User management, billing overview
- [x] **Stripe billing** - Subscription checkout and management
- [x] **Permission system** - Role-based access control

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

## Phase 3 Improvements TODO

### 🔴 HIGH PRIORITY

#### 1. Redis Integration - Session Management

**Status:** [ ] Not Started
**Why:** Every API request queries PostgreSQL for session validation. Under load, this becomes a bottleneck.
**Impact:** 50% reduction in DB queries, sub-millisecond session lookups

**Implementation:**

```typescript
// src/lib/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// Session helpers
export const sessionKey = (token: string) => `session:${token}`;
export const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
```

**Files to modify:**

- [ ] Create `src/lib/redis.ts`
- [ ] Update `src/lib/auth.ts` - Use Redis for session storage
- [ ] Update `.env.example` - Add Redis config
- [ ] Update `package.json` - Add `ioredis` dependency

---

#### 2. Redis Integration - Rate Limiting

**Status:** [ ] Not Started
**Why:** No rate limiting = vulnerable to abuse, API spam, cost attacks
**Impact:** Security hardening, cost protection

**Implementation:**

```typescript
// Sliding window rate limiting
const RATE_LIMIT = {
  authenticated: { requests: 60, window: 60 }, // 60 req/min
  unauthenticated: { requests: 10, window: 60 }, // 10 req/min
  chat: { requests: 20, window: 60 }, // 20 messages/min
};

// Rate limit middleware
export async function rateLimit(userId: string, type: string): Promise<boolean> {
  const key = `ratelimit:${type}:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, RATE_LIMIT[type].window);
  return count <= RATE_LIMIT[type].requests;
}
```

**Files to modify:**

- [ ] Create `src/middleware/rateLimit.ts`
- [ ] Update `src/server.ts` - Apply rate limit middleware
- [ ] Update `src/routes/chat.ts` - Chat-specific rate limiting

---

#### 3. Webhook Reliability - Queue System

**Status:** [ ] Not Started
**Why:** Stripe webhooks may fail, current fallback is client-side verification
**Impact:** Reliable subscription status sync

**Implementation:**

```typescript
// Use BullMQ for job queue (requires Redis)
import { Queue, Worker } from 'bullmq';

const webhookQueue = new Queue('webhooks', { connection: redis });

// Retry failed webhooks with exponential backoff
webhookQueue.add('stripe-webhook', payload, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
});
```

**Files to modify:**

- [ ] Create `src/lib/queue.ts`
- [ ] Update `src/routes/billing.ts` - Queue webhook processing
- [ ] Create `src/workers/webhook.ts` - Process webhook jobs

---

### 🟡 MEDIUM PRIORITY

#### 4. Team Invite Emails

**Status:** [ ] Not Started
**Why:** Invites generate tokens but no email sent - users must manually share links
**Impact:** Better UX for team invitations

**Implementation:**

```typescript
// Use Resend for transactional emails
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTeamInvite(email: string, teamName: string, inviteLink: string) {
  await resend.emails.send({
    from: 'noreply@chat.free-ai.dev',
    to: email,
    subject: `You've been invited to join ${teamName}`,
    html: `<a href="${inviteLink}">Join Team</a>`,
  });
}
```

**Files to modify:**

- [ ] Create `src/lib/email.ts`
- [ ] Update `src/routes/teams.ts` - Send email on invite
- [ ] Update `.env.example` - Add RESEND_API_KEY
- [ ] Create email templates

---

#### 5. Usage Analytics Caching

**Status:** [ ] Not Started
**Why:** Every /profile/usage call aggregates from usage_logs table - expensive queries
**Impact:** 70% cache hit rate, faster dashboard

**Implementation:**

```typescript
// Cache usage stats with 5-minute TTL
const usageCacheKey = (userId: string, period: string) => `usage:${userId}:${period}`;
const USAGE_CACHE_TTL = 5 * 60; // 5 minutes

export async function getCachedUsage(userId: string, period: string) {
  const cached = await redis.get(usageCacheKey(userId, period));
  if (cached) return JSON.parse(cached);

  const usage = await aggregateUsage(userId, period);
  await redis.setex(usageCacheKey(userId, period), USAGE_CACHE_TTL, JSON.stringify(usage));
  return usage;
}
```

**Files to modify:**

- [ ] Update `src/routes/profile.ts` - Use cached usage stats
- [ ] Invalidate cache on new usage log entry

---

#### 6. Model List Caching

**Status:** [ ] Not Started
**Why:** OpenRouter model list fetched on every page load
**Impact:** Faster initial load, reduced external API calls

**Implementation:**

```typescript
const MODEL_CACHE_KEY = 'openrouter:models';
const MODEL_CACHE_TTL = 60 * 60; // 1 hour

export async function getCachedModels() {
  const cached = await redis.get(MODEL_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const models = await fetchOpenRouterModels();
  await redis.setex(MODEL_CACHE_KEY, MODEL_CACHE_TTL, JSON.stringify(models));
  return models;
}
```

**Files to modify:**

- [ ] Update `src/routes/models.ts` - Cache model list

---

### 🟢 LOW PRIORITY

#### 7. Real-time Team Updates

**Status:** [ ] Not Started
**Why:** Team members don't see new messages instantly
**Impact:** Better collaboration experience

**Implementation:**

```typescript
// Redis Pub/Sub for real-time updates
const subscriber = redis.duplicate();

subscriber.subscribe('team:updates');
subscriber.on('message', (channel, message) => {
  // Broadcast to connected WebSocket clients
});

// Publish team activity
await redis.publish(
  'team:updates',
  JSON.stringify({
    type: 'new_message',
    teamId,
    conversationId,
  })
);
```

**Files to modify:**

- [ ] Create `src/lib/realtime.ts`
- [ ] Add WebSocket endpoint to `src/server.ts`
- [ ] Update `src/routes/chat.ts` - Publish on new message

---

#### 8. Admin Dashboard Improvements

**Status:** [ ] Not Started
**Why:** Large user lists load slowly, basic pagination
**Impact:** Better admin UX at scale

**Improvements:**

- [ ] Cursor-based pagination instead of offset
- [ ] Redis-cached user counts
- [ ] Search/filter users
- [ ] Bulk actions (suspend, upgrade, etc.)

---

#### 9. Subscription Webhook Events

**Status:** [ ] Not Started
**Why:** Only handling `checkout.session.completed`, missing other events
**Impact:** Complete subscription lifecycle handling

**Events to handle:**

- [ ] `customer.subscription.updated` - Plan changes
- [ ] `customer.subscription.deleted` - Cancellations
- [ ] `invoice.payment_failed` - Failed payments
- [ ] `invoice.paid` - Successful renewals

---

## Redis Implementation Order

```text
Step 1: Basic Setup
├── Install ioredis
├── Create src/lib/redis.ts
├── Add env variables
└── Test connection

Step 2: Session Management
├── Store sessions in Redis
├── Update auth.ts
└── Remove session queries from PostgreSQL

Step 3: Rate Limiting
├── Create middleware
├── Apply to routes
└── Configure limits per endpoint

Step 4: Caching Layer
├── Usage analytics cache
├── Model list cache
└── Permission cache

Step 5: Background Jobs
├── Setup BullMQ
├── Webhook retry queue
├── Email sending queue
```

---

## Tech Stack

| Layer      | Technology                  |
| ---------- | --------------------------- |
| Frontend   | React 18, Vite, TailwindCSS |
| Backend    | Hono (Bun runtime)          |
| Database   | PostgreSQL                  |
| Cache      | Redis (planned)             |
| Auth       | Google OAuth 2.0            |
| AI         | OpenRouter API              |
| Payments   | Stripe                      |
| Deployment | Bun                         |

---

## File Structure

```text
src/
├── server.ts              # Main API server
├── migrate.ts             # Migration runner
├── migrations/            # Database migrations (001-020)
├── lib/
│   ├── auth.ts            # Authentication utilities
│   ├── config.ts          # Centralized configuration
│   ├── db.ts              # Database connection
│   ├── permissions.ts     # Role-based permissions
│   ├── stripe.ts          # Stripe client
│   ├── redis.ts           # Redis client (planned)
│   ├── email.ts           # Email service (planned)
│   ├── queue.ts           # Job queue (planned)
│   └── api/               # Frontend API client
├── routes/
│   ├── admin.ts           # Admin dashboard API
│   ├── auth.ts            # Authentication routes
│   ├── billing.ts         # Stripe billing routes
│   ├── chat.ts            # Chat/streaming routes
│   ├── conversations.ts   # Conversation CRUD
│   ├── models.ts          # OpenRouter models
│   ├── permissions.ts     # Permission checks
│   ├── profile.ts         # User profile & usage
│   └── teams.ts           # Team management
├── middleware/            # Express middleware (planned)
│   └── rateLimit.ts       # Rate limiting
├── workers/               # Background workers (planned)
│   └── webhook.ts         # Webhook processor
├── components/            # React components
└── hooks/                 # Custom React hooks
```

---

_Last updated: December 28, 2024_
