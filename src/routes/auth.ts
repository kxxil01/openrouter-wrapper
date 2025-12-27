import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import * as auth from '../lib/auth';
import { config } from '../lib/config';

const DISABLE_PAYWALL = config.paywall.disabled;
const AUTH_ENABLED = config.auth.google.clientId && config.auth.google.clientSecret;

const authRoutes = new Hono();

authRoutes.get('/login', (c) => {
  if (!AUTH_ENABLED) {
    return c.json({ error: 'Authentication not configured' }, 503);
  }
  const authUrl = auth.getGoogleAuthUrl();
  return c.redirect(authUrl);
});

authRoutes.get('/callback', async (c) => {
  if (!AUTH_ENABLED) {
    return c.json({ error: 'Authentication not configured' }, 503);
  }

  try {
    const code = c.req.query('code');
    if (!code) {
      return c.redirect('/?error=no_code');
    }

    const tokens = await auth.exchangeCodeForTokens(code);
    const googleUser = await auth.getGoogleUserInfo(tokens.access_token);

    const user = await auth.findOrCreateUser(googleUser);

    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
    const userAgent = c.req.header('user-agent');
    const sessionToken = await auth.createSession(user.id, ipAddress, userAgent);

    setCookie(c, 'session', sessionToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'Lax',
      maxAge: config.auth.sessionExpiryDays * 24 * 60 * 60,
      path: '/',
    });

    return c.redirect('/');
  } catch (error) {
    console.error('Auth callback error:', error);
    return c.redirect('/?error=auth_failed');
  }
});

authRoutes.get('/logout', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (sessionToken) {
    await auth.deleteSession(sessionToken);
  }
  deleteCookie(c, 'session', { path: '/' });
  return c.redirect('/');
});

authRoutes.get('/me', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ user: null });
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    deleteCookie(c, 'session', { path: '/' });
    return c.json({ user: null });
  }

  const isSuperAdmin = user.user_type === 'superadmin';
  const bypassPaywall = isSuperAdmin || DISABLE_PAYWALL;

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      user_type: user.user_type,
      subscription_status: bypassPaywall ? 'active' : user.subscription_status,
      subscription_tier: bypassPaywall ? 'pro' : user.subscription_tier,
      subscription_scope: isSuperAdmin ? 'organization' : user.subscription_scope,
      subscription_expires_at: user.subscription_expires_at,
      message_count: user.message_count || 0,
      free_messages_remaining: bypassPaywall ? 999 : Math.max(0, 5 - (user.message_count || 0)),
    },
    paywall_disabled: bypassPaywall,
  });
});

export default authRoutes;
