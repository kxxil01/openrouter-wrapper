import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';
import { getCache, setCache, isRedisAvailable } from '../lib/redis';

const adminRoutes = new Hono();

const COUNTS_CACHE_TTL = 60;

async function isSuperAdmin(sessionToken: string): Promise<auth.User | null> {
  if (!sessionToken) return null;
  const user = await auth.validateSession(sessionToken);
  if (!user) return null;
  if (user.user_type !== 'superadmin') {
    return null;
  }
  return user;
}

interface CachedCounts {
  totalUsers: number;
  activeSubscribers: number;
  freeUsers: number;
  totalConversations: number;
  totalMessages: number;
  cachedAt: string;
}

async function getCachedCounts(): Promise<CachedCounts | null> {
  if (!isRedisAvailable()) return null;
  return await getCache<CachedCounts>('admin', 'counts');
}

async function setCachedCounts(counts: CachedCounts): Promise<void> {
  await setCache('admin', 'counts', counts, COUNTS_CACHE_TTL);
}

adminRoutes.get('/stats', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isSuperAdmin(sessionToken || '');
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);

  const forceRefresh = c.req.query('refresh') === 'true';

  try {
    const cachedCounts = !forceRefresh ? await getCachedCounts() : null;

    let userStats;
    let conversationStats;
    let messageStats;

    if (cachedCounts) {
      userStats = {
        total_users: cachedCounts.totalUsers,
        active_subscribers: cachedCounts.activeSubscribers,
        free_users: cachedCounts.freeUsers,
      };
      conversationStats = { total_conversations: cachedCounts.totalConversations };
      messageStats = { total_messages: cachedCounts.totalMessages };
    } else {
      [userStats] = await sql`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscribers,
          COUNT(*) FILTER (WHERE subscription_status = 'free') as free_users,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d
        FROM users
      `;

      [conversationStats] = await sql`
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_conversations_7d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_conversations_30d
        FROM conversations
      `;

      [messageStats] = await sql`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_messages_7d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_messages_30d
        FROM messages
      `;

      await setCachedCounts({
        totalUsers: parseInt(userStats.total_users),
        activeSubscribers: parseInt(userStats.active_subscribers),
        freeUsers: parseInt(userStats.free_users),
        totalConversations: parseInt(conversationStats.total_conversations),
        totalMessages: parseInt(messageStats.total_messages),
        cachedAt: new Date().toISOString(),
      });
    }

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

    const revenueStats = await sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) FILTER (WHERE subscription_status = 'active') as new_subscribers
      FROM users
      WHERE created_at > NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `;

    return c.json({
      users: userStats,
      conversations: conversationStats,
      messages: messageStats,
      usage: usageStats,
      teams: teamStats,
      dailyActiveUsers,
      topModels,
      revenueStats,
      cached: !!cachedCounts,
      cachedAt: cachedCounts?.cachedAt || null,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

adminRoutes.get('/users', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isSuperAdmin(sessionToken || '');
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);

  const cursor = c.req.query('cursor') || '';
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const search = c.req.query('search') || '';
  const status = c.req.query('status') || '';
  const sortBy = c.req.query('sortBy') || 'created_at';
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const validSortFields = ['created_at', 'email', 'name', 'subscription_status'];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';

  try {
    const whereConditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(u.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status && ['free', 'active', 'cancelled', 'expired', 'past_due'].includes(status)) {
      whereConditions.push(`u.subscription_status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (cursor) {
      whereConditions.push(`u.id < $${paramIndex}`);
      params.push(cursor);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const users = await sql.unsafe(
      `SELECT 
        u.id, u.email, u.name, u.picture, u.subscription_status, u.user_type,
        u.created_at, u.updated_at,
        (SELECT COUNT(*) FROM conversations WHERE user_id = u.id) as conversation_count,
        (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = u.id) as message_count,
        (SELECT COALESCE(SUM(total_tokens), 0) FROM usage_logs WHERE user_id = u.id) as total_tokens
      FROM users u
      ${whereClause}
      ORDER BY u.${safeSortBy} ${sortOrder}, u.id DESC
      LIMIT $${paramIndex}`,
      [...params, limit + 1] as (string | number)[]
    );

    const hasMore = users.length > limit;
    const resultUsers = hasMore ? users.slice(0, -1) : users;
    const nextCursor =
      hasMore && resultUsers.length > 0 ? resultUsers[resultUsers.length - 1].id : null;

    const countParams = params.slice(0, cursor ? params.length - 1 : params.length);
    const countWhereConditions = whereConditions.slice(
      0,
      cursor ? whereConditions.length - 1 : whereConditions.length
    );
    const countWhereClause =
      countWhereConditions.length > 0 ? `WHERE ${countWhereConditions.join(' AND ')}` : '';

    const [countResult] = await sql.unsafe(
      `SELECT COUNT(*) as count FROM users u ${countWhereClause}`,
      countParams as (string | number)[]
    );
    const total = parseInt(countResult.count);

    return c.json({
      users: resultUsers,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

adminRoutes.get('/users/:id', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isSuperAdmin(sessionToken || '');
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
  const admin = await isSuperAdmin(sessionToken || '');
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
  const admin = await isSuperAdmin(sessionToken || '');
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

adminRoutes.post('/users/bulk', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isSuperAdmin(sessionToken || '');
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);

  const { userIds, action, value } = await c.req.json();

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return c.json({ error: 'User IDs required' }, 400);
  }

  if (userIds.length > 100) {
    return c.json({ error: 'Maximum 100 users per bulk action' }, 400);
  }

  const validActions = ['update_status', 'update_user_type', 'delete'];
  if (!validActions.includes(action)) {
    return c.json({ error: 'Invalid action' }, 400);
  }

  try {
    let affected = 0;

    if (action === 'update_status') {
      const validStatuses = ['free', 'active', 'cancelled', 'expired', 'past_due'];
      if (!validStatuses.includes(value)) {
        return c.json({ error: 'Invalid subscription status' }, 400);
      }
      const result = await sql`
        UPDATE users 
        SET subscription_status = ${value}, updated_at = NOW()
        WHERE id = ANY(${userIds}::uuid[])
      `;
      affected = result.count;
    } else if (action === 'update_user_type') {
      const validTypes = ['user', 'admin', 'superadmin'];
      if (!validTypes.includes(value)) {
        return c.json({ error: 'Invalid user type' }, 400);
      }
      const result = await sql`
        UPDATE users 
        SET user_type = ${value}, updated_at = NOW()
        WHERE id = ANY(${userIds}::uuid[])
      `;
      affected = result.count;
    } else if (action === 'delete') {
      await sql`DELETE FROM sessions WHERE user_id = ANY(${userIds}::uuid[])`;
      await sql`DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ANY(${userIds}::uuid[]))`;
      await sql`DELETE FROM conversations WHERE user_id = ANY(${userIds}::uuid[])`;
      await sql`DELETE FROM usage_logs WHERE user_id = ANY(${userIds}::uuid[])`;
      await sql`DELETE FROM team_members WHERE user_id = ANY(${userIds}::uuid[])`;
      const result = await sql`DELETE FROM users WHERE id = ANY(${userIds}::uuid[])`;
      affected = result.count;
    }

    console.log(`[Admin] Bulk action ${action} on ${affected} users by ${admin.email}`);

    return c.json({
      success: true,
      action,
      affected,
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return c.json({ error: 'Failed to perform bulk action' }, 500);
  }
});

adminRoutes.get('/users/export', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isSuperAdmin(sessionToken || '');
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);

  const format = c.req.query('format') || 'json';
  const status = c.req.query('status') || '';

  try {
    let users;
    if (status && ['free', 'active', 'cancelled', 'expired', 'past_due'].includes(status)) {
      users = await sql`
        SELECT 
          u.id, u.email, u.name, u.subscription_status, u.user_type,
          u.created_at, u.updated_at,
          (SELECT COUNT(*) FROM conversations WHERE user_id = u.id) as conversation_count,
          (SELECT COALESCE(SUM(total_tokens), 0) FROM usage_logs WHERE user_id = u.id) as total_tokens
        FROM users u
        WHERE u.subscription_status = ${status}
        ORDER BY u.created_at DESC
      `;
    } else {
      users = await sql`
        SELECT 
          u.id, u.email, u.name, u.subscription_status, u.user_type,
          u.created_at, u.updated_at,
          (SELECT COUNT(*) FROM conversations WHERE user_id = u.id) as conversation_count,
          (SELECT COALESCE(SUM(total_tokens), 0) FROM usage_logs WHERE user_id = u.id) as total_tokens
        FROM users u
        ORDER BY u.created_at DESC
      `;
    }

    if (format === 'csv') {
      const headers = [
        'id',
        'email',
        'name',
        'subscription_status',
        'user_type',
        'conversation_count',
        'total_tokens',
        'created_at',
      ];
      const csvRows = [headers.join(',')];

      for (const user of users) {
        const row = headers.map((h) => {
          const val = user[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        });
        csvRows.push(row.join(','));
      }

      return new Response(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return c.json({
      users,
      exportedAt: new Date().toISOString(),
      total: users.length,
    });
  } catch (error) {
    console.error('Error exporting users:', error);
    return c.json({ error: 'Failed to export users' }, 500);
  }
});

adminRoutes.get('/activity', async (c) => {
  const sessionToken = getCookie(c, 'session');
  const admin = await isSuperAdmin(sessionToken || '');
  if (!admin) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const recentSignups = await sql`
      SELECT id, email, name, subscription_status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const recentConversations = await sql`
      SELECT c.id, c.title, c.model_id, c.created_at, u.email as user_email
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `;

    const recentUsage = await sql`
      SELECT ul.model_id, ul.total_tokens, ul.created_at, u.email as user_email
      FROM usage_logs ul
      JOIN users u ON ul.user_id = u.id
      ORDER BY ul.created_at DESC
      LIMIT 20
    `;

    const hourlyActivity = await sql`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as message_count
      FROM messages
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
    `;

    return c.json({
      recentSignups,
      recentConversations,
      recentUsage,
      hourlyActivity,
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return c.json({ error: 'Failed to fetch activity' }, 500);
  }
});

export default adminRoutes;
