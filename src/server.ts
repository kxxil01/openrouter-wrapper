import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import authRoutes from './routes/auth';
import conversationRoutes from './routes/conversations';
import messageRoutes from './routes/messages';
import chatRoutes from './routes/chat';
import preferenceRoutes from './routes/preferences';
import searchRoutes from './routes/search';
import modelRoutes from './routes/models';
import folderRoutes from './routes/folders';

const app = new Hono();

const PORT = process.env.PORT || 3001;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AUTH_ENABLED = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (!OPENROUTER_API_KEY) {
  console.warn('OPENROUTER_API_KEY is not set - Claude API functionality will be unavailable');
}

if (!AUTH_ENABLED) {
  console.warn('Google OAuth not configured - authentication disabled');
}

app.use(
  '*',
  cors({
    origin: ['http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
  })
);

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.route('/auth', authRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/conversations', conversationRoutes);
app.route('/api/messages', messageRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/preferences', preferenceRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/models', modelRoutes);
app.route('/api/folders', folderRoutes);

const distPath = join(import.meta.dir, '../dist');

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
  };
  return types[ext || ''] || 'application/octet-stream';
}

app.get('/*', async (c) => {
  const url = new URL(c.req.url);
  const filePath = url.pathname === '/' ? '/index.html' : url.pathname;

  const fullPath = join(distPath, filePath);

  if (existsSync(fullPath)) {
    try {
      const file = Bun.file(fullPath);
      const contentType = getContentType(filePath);
      return new Response(file, {
        headers: { 'Content-Type': contentType },
      });
    } catch {
      // Fall through to index.html
    }
  }

  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    const file = Bun.file(indexPath);
    return new Response(file, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return c.text('Not found - run "bun run build" first', 404);
});

console.log(`Server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
  idleTimeout: 120,
};
