import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';

const DISABLE_PAYWALL = process.env.DISABLE_PAYWALL === 'true';

const profileRoutes = new Hono();

profileRoutes.get('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM conversations WHERE user_id = ${user.id}) as total_conversations,
        (SELECT COUNT(*) FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ${user.id})) as total_messages,
        (SELECT COUNT(*) FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ${user.id}) AND role = 'user') as user_messages,
        (SELECT COUNT(*) FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ${user.id}) AND role = 'assistant') as assistant_messages
    `;

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        created_at: user.created_at,
        subscription_status: DISABLE_PAYWALL ? 'active' : user.subscription_status,
        subscription_expires_at: user.subscription_expires_at,
        message_count: user.message_count || 0,
        message_count_reset_at: user.message_count_reset_at,
        free_messages_remaining: Math.max(0, 5 - (user.message_count || 0)),
        total_tokens_used: user.total_tokens_used || 0,
        has_custom_api_key: !!user.openrouter_api_key,
      },
      stats: {
        total_conversations: parseInt(stats.total_conversations) || 0,
        total_messages: parseInt(stats.total_messages) || 0,
        user_messages: parseInt(stats.user_messages) || 0,
        assistant_messages: parseInt(stats.assistant_messages) || 0,
      },
      paywall_disabled: DISABLE_PAYWALL,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

profileRoutes.put('/api-key', async (c) => {
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
    const { api_key } = body;

    if (api_key && !api_key.startsWith('sk-or-')) {
      return c.json({ error: 'Invalid OpenRouter API key format' }, 400);
    }

    await sql`
      UPDATE users 
      SET openrouter_api_key = ${api_key || null}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    return c.json({ message: 'API key updated successfully' });
  } catch (error) {
    console.error('Error updating API key:', error);
    return c.json({ error: 'Failed to update API key' }, 500);
  }
});

profileRoutes.delete('/api-key', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    await sql`
      UPDATE users 
      SET openrouter_api_key = NULL, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    return c.json({ message: 'API key removed successfully' });
  } catch (error) {
    console.error('Error removing API key:', error);
    return c.json({ error: 'Failed to remove API key' }, 500);
  }
});

export default profileRoutes;
