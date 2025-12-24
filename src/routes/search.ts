import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';

const searchRoutes = new Hono();

searchRoutes.get('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const query = c.req.query('q');
    if (!query || query.trim().length === 0) {
      return c.json({ conversations: [], messages: [] });
    }

    const searchQuery = query.trim().split(/\s+/).join(' & ');

    const conversations = await sql`
      SELECT c.id, c.title, c.model_id, c.updated_at,
             ts_rank(to_tsvector('english', c.title), to_tsquery('english', ${searchQuery})) as rank
      FROM conversations c
      WHERE c.user_id = ${user.id}
        AND to_tsvector('english', c.title) @@ to_tsquery('english', ${searchQuery})
      ORDER BY rank DESC, c.updated_at DESC
      LIMIT 10
    `;

    const messages = await sql`
      SELECT m.id, m.conversation_id, m.role, m.content, m.created_at,
             c.title as conversation_title,
             ts_rank(to_tsvector('english', m.content), to_tsquery('english', ${searchQuery})) as rank,
             ts_headline('english', m.content, to_tsquery('english', ${searchQuery}), 
               'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as highlight
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ${user.id}
        AND to_tsvector('english', m.content) @@ to_tsquery('english', ${searchQuery})
      ORDER BY rank DESC, m.created_at DESC
      LIMIT 20
    `;

    return c.json({ conversations, messages });
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ error: 'Search failed' }, 500);
  }
});

export default searchRoutes;
