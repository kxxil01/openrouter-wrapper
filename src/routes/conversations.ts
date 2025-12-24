import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { v7 as uuidv7 } from 'uuid';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';

const DEFAULT_MODEL_ID = process.env.DEFAULT_MODEL_ID || 'deepseek/deepseek-r1-0528:free';

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

const conversationRoutes = new Hono();

conversationRoutes.get('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const conversations = await sql`
      SELECT * FROM conversations 
      WHERE user_id = ${user.id}
      ORDER BY updated_at DESC
    `;
    return c.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return c.json({ error: 'Failed to fetch conversations' }, 500);
  }
});

conversationRoutes.post('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const { title, model_id } = body;
    const id = uuidv7();

    const [conversation] = await sql`
      INSERT INTO conversations (id, user_id, title, model_id, created_at, updated_at)
      VALUES (${id}, ${user.id}, ${title || 'New Conversation'}, ${model_id || DEFAULT_MODEL_ID}, NOW(), NOW())
      RETURNING *
    `;

    return c.json(conversation, 201);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return c.json({ error: 'Failed to create conversation' }, 500);
  }
});

conversationRoutes.put('/:id', async (c) => {
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
    const { title } = await c.req.json();

    const [conversation] = await sql`
      UPDATE conversations SET title = ${title}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `;

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json(conversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    return c.json({ error: 'Failed to update conversation' }, 500);
  }
});

conversationRoutes.delete('/:id', async (c) => {
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
      SELECT id FROM conversations WHERE id = ${id} AND user_id = ${user.id}
    `;

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    await sql`DELETE FROM messages WHERE conversation_id = ${id}`;
    await sql`DELETE FROM conversations WHERE id = ${id} AND user_id = ${user.id}`;

    return c.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return c.json({ error: 'Failed to delete conversation' }, 500);
  }
});

conversationRoutes.post('/:id/generate-title', async (c) => {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  try {
    const id = c.req.param('id');

    const messages = await sql`
      SELECT role, content FROM messages 
      WHERE conversation_id = ${id}
      ORDER BY created_at ASC LIMIT 6
    `;

    if (!messages.length) {
      return c.json({ error: 'No messages found' }, 404);
    }

    const conversationContext = messages
      .map((m) => `${(m as { role: string }).role}: ${(m as { content: string }).content}`)
      .join('\n')
      .substring(0, 2000);

    const titlePrompt = [
      {
        role: 'system',
        content:
          'Generate a short, concise title (max 50 characters) that summarizes this conversation. Return ONLY the title, nothing else. No quotes, no explanation.',
      },
      {
        role: 'user',
        content: `Summarize this conversation in a short title:\n\n${conversationContext}`,
      },
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: titlePrompt,
        max_tokens: 50,
        temperature: 0.3,
      }),
    });

    let title = 'New Conversation';

    if (response.ok) {
      const data = await response.json();
      const generatedTitle = data.choices?.[0]?.message?.content?.trim();
      if (generatedTitle && generatedTitle.length > 0) {
        title = generatedTitle.replace(/^["']|["']$/g, '').substring(0, 50);
      }
    } else {
      const firstMessage = (messages[0] as { content: string }).content;
      title = firstMessage.length > 50 ? firstMessage.substring(0, 47) + '...' : firstMessage;
    }

    const [conversation] = await sql`
      UPDATE conversations SET title = ${title}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return c.json(conversation);
  } catch (error) {
    console.error('Error generating title:', error);
    return c.json({ error: 'Failed to generate title' }, 500);
  }
});

conversationRoutes.get('/:id/export', async (c) => {
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
    const format = c.req.query('format') || 'json';

    const [conversation] = await sql`
      SELECT * FROM conversations WHERE id = ${id} AND user_id = ${user.id}
    `;

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const messages = await sql`
      SELECT role, content, created_at FROM messages 
      WHERE conversation_id = ${id} 
      ORDER BY created_at ASC
    `;

    if (format === 'markdown') {
      let markdown = `# ${conversation.title}\n\n`;
      markdown += `*Exported on ${new Date().toISOString()}*\n\n`;
      markdown += `**Model:** ${conversation.model_id}\n\n---\n\n`;

      for (const msg of messages) {
        const role = msg.role === 'user' ? '**You**' : '**Assistant**';
        markdown += `${role}:\n\n${msg.content}\n\n---\n\n`;
      }

      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${conversation.title.replace(/[^a-z0-9]/gi, '_')}.md"`,
        },
      });
    }

    const exportData = {
      id: conversation.id,
      title: conversation.title,
      model_id: conversation.model_id,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })),
      exported_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${conversation.title.replace(/[^a-z0-9]/gi, '_')}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting conversation:', error);
    return c.json({ error: 'Failed to export conversation' }, 500);
  }
});

conversationRoutes.get('/:id/messages', async (c) => {
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

conversationRoutes.post('/:id/messages', async (c) => {
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

conversationRoutes.delete('/:id/messages/after/:messageIndex', async (c) => {
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

export default conversationRoutes;
