import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import * as auth from '../lib/auth';
import { getUserPermissions, getRoleName } from '../lib/permissions';

const permissionRoutes = new Hono();

permissionRoutes.get('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const permissions = getUserPermissions(user);
  const roleName = getRoleName(user);

  return c.json({
    permissions,
    roleName,
    user_type: user.user_type,
    subscription_tier: user.subscription_tier,
    subscription_scope: user.subscription_scope,
  });
});

export default permissionRoutes;
