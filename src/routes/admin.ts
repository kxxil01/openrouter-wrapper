import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';

const adminRoutes = new Hono();

async function isAdmin(sessionToken: string): Promise<auth.User | null> {
  if (!sessionToken) return null;
  const user = await auth.validateSession(sessionToken);
  if (!user) return null;
  if (user.user_type !== 'admin') {
    return null;
  }
  return user;
}

adminRoutes.get('/stats', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isAdmin(sessionToken || '');
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const [userStats] = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscribers,
        COUNT(*) FILTER (WHERE subscription_status = 'free') as free_users,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d
      FROM users
    `;

    const [conversationStats] = await sql`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_conversations_7d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_conversations_30d
      FROM conversations
    `;

    const [messageStats] = await sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_messages_7d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_messages_30d
      FROM messages
    `;

    const [usageStats] = await sql`
      SELECT 
        COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as total_completion_tokens,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COUNT(*) as total_requests
      FROM usage_logs
    `;

    const [teamStats] = await sql`
      SELECT 
        COUNT(*) as total_teams,
        (SELECT COUNT(*) FROM team_members) as total_team_members
      FROM teams
    `;

    const dailyActiveUsers = await sql`
      SELECT 
        DATE(m.created_at) as date,
        COUNT(DISTINCT c.user_id) as active_users
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(m.created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const topModels = await sql`
      SELECT 
        model_id,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens
      FROM usage_logs
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY model_id
      ORDER BY request_count DESC
      LIMIT 10
    `;

    return c.json({
      users: userStats,
      conversations: conversationStats,
      messages: messageStats,
      usage: usageStats,
      teams: teamStats,
      dailyActiveUsers,
      topModels,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

adminRoutes.get('/users', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isAdmin(sessionToken || '');
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const search = c.req.query('search') || '';
  const offset = (page - 1) * limit;

  try {
    let users;
    let total;

    if (search) {
      users = await sql`
        SELECT 
          u.id, u.email, u.name, u.picture, u.subscription_status,
          u.created_at, u.updated_at,
          (SELECT COUNT(*) FROM conversations WHERE user_id = u.id) as conversation_count,
          (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = u.id) as message_count,
          (SELECT COALESCE(SUM(total_tokens), 0) FROM usage_logs WHERE user_id = u.id) as total_tokens
        FROM users u
        WHERE u.email ILIKE ${'%' + search + '%'} OR u.name ILIKE ${'%' + search + '%'}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [countResult] = await sql`
        SELECT COUNT(*) as count FROM users 
        WHERE email ILIKE ${'%' + search + '%'} OR name ILIKE ${'%' + search + '%'}
      `;
      total = parseInt(countResult.count);
    } else {
      users = await sql`
        SELECT 
          u.id, u.email, u.name, u.picture, u.subscription_status,
          u.created_at, u.updated_at,
          (SELECT COUNT(*) FROM conversations WHERE user_id = u.id) as conversation_count,
          (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = u.id) as message_count,
          (SELECT COALESCE(SUM(total_tokens), 0) FROM usage_logs WHERE user_id = u.id) as total_tokens
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [countResult] = await sql`SELECT COUNT(*) as count FROM users`;
      total = parseInt(countResult.count);
    }

    return c.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

adminRoutes.get('/users/:id', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isAdmin(sessionToken || '');
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);

  const userId = c.req.param('id');

  try {
    const [user] = await sql`
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM conversations WHERE user_id = u.id) as conversation_count,
        (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = u.id) as message_count
      FROM users u
      WHERE u.id = ${userId}
    `;

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const usageStats = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens
      FROM usage_logs
      WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const recentConversations = await sql`
      SELECT id, title, model_id, created_at, updated_at
      FROM conversations
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT 10
    `;

    const teams = await sql`
      SELECT t.*, tm.role
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ${userId}
    `;

    return c.json({
      user,
      usageStats,
      recentConversations,
      teams,
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return c.json({ error: 'Failed to fetch user details' }, 500);
  }
});

adminRoutes.patch('/users/:id', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isAdmin(sessionToken || '');
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);

  const userId = c.req.param('id');
  const { subscription_status } = await c.req.json();

  try {
    if (subscription_status) {
      await sql`
        UPDATE users 
        SET subscription_status = ${subscription_status}, updated_at = NOW()
        WHERE id = ${userId}
      `;
    }

    const [user] = await sql`SELECT * FROM users WHERE id = ${userId}`;
    return c.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

adminRoutes.get('/billing', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isAdmin(sessionToken || '');
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const subscriptionBreakdown = await sql`
      SELECT 
        subscription_status,
        COUNT(*) as count
      FROM users
      GROUP BY subscription_status
    `;

    const monthlyUsage = await sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        COUNT(DISTINCT user_id) as unique_users
      FROM usage_logs
      WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `;

    const topUsers = await sql`
      SELECT 
        u.id, u.email, u.name, u.subscription_status,
        SUM(ul.total_tokens) as total_tokens,
        COUNT(*) as request_count
      FROM usage_logs ul
      JOIN users u ON ul.user_id = u.id
      WHERE ul.created_at > NOW() - INTERVAL '30 days'
      GROUP BY u.id, u.email, u.name, u.subscription_status
      ORDER BY total_tokens DESC
      LIMIT 20
    `;

    return c.json({
      subscriptionBreakdown,
      monthlyUsage,
      topUsers,
    });
  } catch (error) {
    console.error('Error fetching billing stats:', error);
    return c.json({ error: 'Failed to fetch billing stats' }, 500);
  }
});

export default adminRoutes;
