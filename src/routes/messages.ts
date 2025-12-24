import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { v7 as uuidv7 } from 'uuid';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

const messageRoutes = new Hono();

messageRoutes.get('/', async (c) => {
  try {
    const conversationId = c.req.query('conversation_id');

    if (!conversationId) {
      return c.json({ error: 'Conversation ID is required' }, 400);
    }

    const [conversation] = await sql`SELECT id FROM conversations WHERE id = ${conversationId}`;
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const messages = await sql`
      SELECT * FROM messages WHERE conversation_id = ${conversationId} ORDER BY created_at ASC
    `;

    return c.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

messageRoutes.post('/', async (c) => {
  try {
    const { conversation_id, role, content } = await c.req.json();

    if (!conversation_id) {
      return c.json({ error: 'conversation_id is required' }, 400);
    }

    if (!role || !['user', 'assistant', 'system'].includes(role)) {
      return c.json({ error: 'Valid role is required (user, assistant, or system)' }, 400);
    }

    if (!content || typeof content !== 'string') {
      return c.json({ error: 'Valid content is required' }, 400);
    }

    const [conversation] = await sql`SELECT id FROM conversations WHERE id = ${conversation_id}`;
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const messageId = uuidv7();
    const [message] = await sql`
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES (${messageId}, ${conversation_id}, ${role}, ${content}, NOW())
      RETURNING *
    `;

    await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${conversation_id}`;

    return c.json(message, 201);
  } catch (error) {
    console.error('Error creating message:', error);
    return c.json({ error: 'Failed to create message' }, 500);
  }
});

messageRoutes.get('/conversation/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const [conversation] = await sql`SELECT id FROM conversations WHERE id = ${id}`;
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const messages = await sql`
      SELECT * FROM messages WHERE conversation_id = ${id} ORDER BY created_at ASC
    `;

    return c.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

messageRoutes.post('/conversation/:id', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const conversationId = c.req.param('id');
    const { role, content } = await c.req.json();

    if (!role || !content) {
      return c.json({ error: 'Role and content are required' }, 400);
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return c.json({ error: 'Role must be user, assistant, or system' }, 400);
    }

    const [conversation] =
      await sql`SELECT id FROM conversations WHERE id = ${conversationId} AND user_id = ${user.id}`;
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const messageId = uuidv7();
    const [message] = await sql`
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES (${messageId}, ${conversationId}, ${role}, ${content}, NOW())
      RETURNING *
    `;

    await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${conversationId}`;

    return c.json(message, 201);
  } catch (error) {
    console.error('Error adding message:', error);
    return c.json({ error: 'Failed to add message' }, 500);
  }
});

messageRoutes.delete('/conversation/:id/after/:messageIndex', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const conversationId = c.req.param('id');
    const messageIndex = parseInt(c.req.param('messageIndex'), 10);

    const [conversation] = await sql`
      SELECT id FROM conversations WHERE id = ${conversationId} AND user_id = ${user.id}
    `;

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const messages = await sql<Message[]>`
      SELECT id FROM messages 
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    `;

    if (messageIndex >= messages.length) {
      return c.json({ error: 'Invalid message index' }, 400);
    }

    const messageIdsToDelete = messages.slice(messageIndex).map((m) => m.id);

    if (messageIdsToDelete.length > 0) {
      await sql`DELETE FROM messages WHERE id = ANY(${messageIdsToDelete})`;
    }

    return c.json({
      message: 'Messages deleted successfully',
      deletedCount: messageIdsToDelete.length,
    });
  } catch (error) {
    console.error('Error deleting messages:', error);
    return c.json({ error: 'Failed to delete messages' }, 500);
  }
});

export default messageRoutes;
