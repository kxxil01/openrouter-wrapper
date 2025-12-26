import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';

const shareRoutes = new Hono();

function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

shareRoutes.post('/conversations/:id/share', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const id = c.req.param('id');

    const [conversation] = await sql`
      SELECT id, share_id, is_shared FROM conversations 
      WHERE id = ${id} AND user_id = ${user.id}
    `;

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    let shareId = conversation.share_id;
    if (!shareId) {
      shareId = generateShareId();
    }

    const [updated] = await sql`
      UPDATE conversations 
      SET share_id = ${shareId}, is_shared = TRUE, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `;

    return c.json({
      share_id: updated.share_id,
      share_url: `/share/${updated.share_id}`,
    });
  } catch (error) {
    console.error('Error sharing conversation:', error);
    return c.json({ error: 'Failed to share conversation' }, 500);
  }
});

shareRoutes.delete('/conversations/:id/share', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const id = c.req.param('id');

    const [conversation] = await sql`
      UPDATE conversations 
      SET is_shared = FALSE, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `;

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({ message: 'Conversation unshared successfully' });
  } catch (error) {
    console.error('Error unsharing conversation:', error);
    return c.json({ error: 'Failed to unshare conversation' }, 500);
  }
});

shareRoutes.get('/shared/:shareId', async (c) => {
  try {
    const shareId = c.req.param('shareId');

    const [conversation] = await sql`
      SELECT c.id, c.title, c.model_id, c.created_at, c.updated_at, u.name as author_name
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      WHERE c.share_id = ${shareId} AND c.is_shared = TRUE
    `;

    if (!conversation) {
      return c.json({ error: 'Shared conversation not found' }, 404);
    }

    const messages = await sql`
      SELECT id, role, content, created_at
      FROM messages 
      WHERE conversation_id = ${conversation.id}
      ORDER BY created_at ASC
    `;

    return c.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        model_id: conversation.model_id,
        author_name: conversation.author_name,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
      },
      messages,
    });
  } catch (error) {
    console.error('Error fetching shared conversation:', error);
    return c.json({ error: 'Failed to fetch shared conversation' }, 500);
  }
});

export default shareRoutes;
