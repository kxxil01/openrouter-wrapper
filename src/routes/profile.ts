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

profileRoutes.get('/usage', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const period = c.req.query('period') || '30d';
    let dateFilter: Date;
    const now = new Date();

    switch (period) {
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [totals] = await sql`
      SELECT 
        COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as total_completion_tokens,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COUNT(*) as total_requests
      FROM usage_logs 
      WHERE user_id = ${user.id} AND created_at >= ${dateFilter}
    `;

    const byModel = await sql`
      SELECT 
        model_id,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COUNT(*) as requests
      FROM usage_logs 
      WHERE user_id = ${user.id} AND created_at >= ${dateFilter}
      GROUP BY model_id
      ORDER BY tokens DESC
      LIMIT 10
    `;

    const dailyUsage = await sql`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COUNT(*) as requests
      FROM usage_logs 
      WHERE user_id = ${user.id} AND created_at >= ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const recentLogs = await sql`
      SELECT 
        id, model_id, prompt_tokens, completion_tokens, total_tokens, 
        used_custom_key, created_at
      FROM usage_logs 
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return c.json({
      period,
      totals: {
        prompt_tokens: parseInt(String(totals.total_prompt_tokens)) || 0,
        completion_tokens: parseInt(String(totals.total_completion_tokens)) || 0,
        total_tokens: parseInt(String(totals.total_tokens)) || 0,
        total_requests: parseInt(String(totals.total_requests)) || 0,
      },
      by_model: byModel.map((m) => ({
        model_id: m.model_id,
        tokens: parseInt(String(m.tokens)) || 0,
        requests: parseInt(String(m.requests)) || 0,
      })),
      daily_usage: dailyUsage.map((d) => ({
        date: d.date,
        tokens: parseInt(String(d.tokens)) || 0,
        requests: parseInt(String(d.requests)) || 0,
      })),
      recent_logs: recentLogs,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return c.json({ error: 'Failed to fetch usage data' }, 500);
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
