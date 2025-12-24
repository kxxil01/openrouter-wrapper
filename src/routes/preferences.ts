import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';

const preferenceRoutes = new Hono();

preferenceRoutes.get('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [preferences] = await sql`
      SELECT * FROM user_preferences WHERE user_id = ${user.id}
    `;

    if (!preferences) {
      return c.json({
        last_conversation_id: null,
        default_model_id: null,
      });
    }

    return c.json({
      last_conversation_id: preferences.last_conversation_id,
      default_model_id: preferences.default_model_id,
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return c.json({ error: 'Failed to fetch preferences' }, 500);
  }
});

preferenceRoutes.patch('/', async (c) => {
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
    const lastConversationId = body.last_conversation_id ?? null;
    const defaultModelId = body.default_model_id ?? null;

    const [existing] = await sql`
      SELECT id, last_conversation_id, default_model_id FROM user_preferences WHERE user_id = ${user.id}
    `;

    if (existing) {
      const [updated] = await sql`
        UPDATE user_preferences 
        SET 
          last_conversation_id = ${lastConversationId !== null ? lastConversationId : existing.last_conversation_id},
          default_model_id = ${defaultModelId !== null ? defaultModelId : existing.default_model_id},
          updated_at = NOW()
        WHERE user_id = ${user.id}
        RETURNING *
      `;
      return c.json(updated);
    } else {
      const [created] = await sql`
        INSERT INTO user_preferences (user_id, last_conversation_id, default_model_id)
        VALUES (${user.id}, ${lastConversationId}, ${defaultModelId})
        RETURNING *
      `;
      return c.json(created);
    }
  } catch (error) {
    console.error('Error updating preferences:', error);
    return c.json({ error: 'Failed to update preferences' }, 500);
  }
});

export default preferenceRoutes;
