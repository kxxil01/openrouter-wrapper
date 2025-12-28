import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { v7 as uuidv7 } from 'uuid';
import { randomBytes } from 'crypto';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';
import { sendTeamInviteEmail, isEmailConfigured } from '../lib/email';

const teamRoutes = new Hono();

const INVITE_TOKEN_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[a-f0-9]{32}$/i;
const MAX_INVITES_PER_HOUR = 20;
const inviteRateLimits = new Map<string, { count: number; resetAt: number }>();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

function generateInviteToken(): string {
  return uuidv7() + '-' + randomBytes(16).toString('hex');
}

function checkInviteRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = inviteRateLimits.get(userId);

  if (!limit || now > limit.resetAt) {
    inviteRateLimits.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }

  if (limit.count >= MAX_INVITES_PER_HOUR) {
    return false;
  }

  limit.count++;
  return true;
}

function isValidInviteToken(token: string): boolean {
  return INVITE_TOKEN_REGEX.test(token);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
  return `${maskedLocal}@${domain}`;
}

teamRoutes.get('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const teams = await sql`
      SELECT t.*, tm.role as user_role,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ${user.id}
      ORDER BY t.name ASC
    `;

    return c.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return c.json({ error: 'Failed to fetch teams' }, 500);
  }
});

teamRoutes.post('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { name, description } = await c.req.json();

    if (!name?.trim()) {
      return c.json({ error: 'Team name is required' }, 400);
    }

    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await sql`SELECT id FROM teams WHERE slug = ${slug}`;
      if (existing.length === 0) break;
      slug = `${baseSlug}-${counter++}`;
    }

    const teamId = uuidv7();
    await sql`
      INSERT INTO teams (id, name, slug, description, owner_id)
      VALUES (${teamId}, ${name.trim()}, ${slug}, ${description || null}, ${user.id})
    `;

    await sql`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (${teamId}, ${user.id}, 'owner')
    `;

    const [team] = await sql`SELECT * FROM teams WHERE id = ${teamId}`;

    return c.json({ team }, 201);
  } catch (error) {
    console.error('Error creating team:', error);
    return c.json({ error: 'Failed to create team' }, 500);
  }
});

teamRoutes.get('/:id', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const teamId = c.req.param('id');

  try {
    const [membership] = await sql`
      SELECT role FROM team_members WHERE team_id = ${teamId} AND user_id = ${user.id}
    `;

    if (!membership) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const [team] = await sql`SELECT * FROM teams WHERE id = ${teamId}`;

    const members = await sql`
      SELECT tm.*, u.name, u.email, u.picture
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ${teamId}
      ORDER BY tm.role = 'owner' DESC, tm.joined_at ASC
    `;

    return c.json({ team, members, userRole: membership.role });
  } catch (error) {
    console.error('Error fetching team:', error);
    return c.json({ error: 'Failed to fetch team' }, 500);
  }
});

teamRoutes.patch('/:id', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const teamId = c.req.param('id');

  try {
    const [membership] = await sql`
      SELECT role FROM team_members WHERE team_id = ${teamId} AND user_id = ${user.id}
    `;

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return c.json({ error: 'Permission denied' }, 403);
    }

    const { name, description } = await c.req.json();

    await sql`
      UPDATE teams 
      SET name = COALESCE(${name || null}, name),
          description = COALESCE(${description}, description),
          updated_at = NOW()
      WHERE id = ${teamId}
    `;

    const [team] = await sql`SELECT * FROM teams WHERE id = ${teamId}`;

    return c.json({ team });
  } catch (error) {
    console.error('Error updating team:', error);
    return c.json({ error: 'Failed to update team' }, 500);
  }
});

teamRoutes.delete('/:id', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const teamId = c.req.param('id');

  try {
    const [team] = await sql`SELECT owner_id FROM teams WHERE id = ${teamId}`;

    if (!team || team.owner_id !== user.id) {
      return c.json({ error: 'Only the owner can delete the team' }, 403);
    }

    await sql`DELETE FROM teams WHERE id = ${teamId}`;

    return c.json({ message: 'Team deleted' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return c.json({ error: 'Failed to delete team' }, 500);
  }
});

teamRoutes.post('/:id/invite', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const teamId = c.req.param('id');

  try {
    const [membership] = await sql`
      SELECT role FROM team_members WHERE team_id = ${teamId} AND user_id = ${user.id}
    `;

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return c.json({ error: 'Permission denied' }, 403);
    }

    if (!checkInviteRateLimit(user.id)) {
      return c.json({ error: 'Too many invites. Please try again later.' }, 429);
    }

    const { email, role = 'member' } = await c.req.json();

    if (!email?.trim()) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail === user.email.toLowerCase()) {
      return c.json({ error: 'You cannot invite yourself' }, 400);
    }

    if (!['admin', 'member'].includes(role)) {
      return c.json({ error: 'Invalid role' }, 400);
    }

    const [existingUser] = await sql`SELECT id FROM users WHERE LOWER(email) = ${normalizedEmail}`;
    if (existingUser) {
      const [existingMember] = await sql`
        SELECT id FROM team_members WHERE team_id = ${teamId} AND user_id = ${existingUser.id}
      `;
      if (existingMember) {
        return c.json({ error: 'User is already a member' }, 400);
      }
    }

    const [existingInvite] = await sql`
      SELECT id FROM team_invites WHERE team_id = ${teamId} AND LOWER(email) = ${normalizedEmail}
    `;
    if (existingInvite) {
      await sql`DELETE FROM team_invites WHERE id = ${existingInvite.id}`;
    }

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO team_invites (team_id, email, role, token, invited_by, expires_at)
      VALUES (${teamId}, ${normalizedEmail}, ${role}, ${token}, ${user.id}, ${expiresAt})
    `;

    const [team] = await sql`SELECT name FROM teams WHERE id = ${teamId}`;
    if (!team) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const inviteLink = `/teams/join/${token}`;

    let emailSent = false;
    if (isEmailConfigured()) {
      emailSent = await sendTeamInviteEmail({
        to: normalizedEmail,
        teamName: team.name,
        inviterName: user.name || user.email,
        inviteLink,
        role,
      });
    }

    return c.json({
      message: emailSent ? 'Invite sent via email' : 'Invite created (share link manually)',
      inviteLink,
      emailSent,
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    return c.json({ error: 'Failed to create invite' }, 500);
  }
});

teamRoutes.post('/join/:token', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const token = c.req.param('token');

  if (!isValidInviteToken(token)) {
    return c.json({ error: 'Invalid invite token format' }, 400);
  }

  try {
    const [invite] = await sql`
      SELECT * FROM team_invites 
      WHERE token = ${token} AND expires_at > NOW()
    `;

    if (!invite) {
      return c.json({ error: 'Invalid or expired invite' }, 400);
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      console.warn(
        `[Security] Invite token mismatch: expected ${maskEmail(invite.email)}, got ${maskEmail(user.email)}`
      );
      return c.json({ error: 'This invite is for a different email address' }, 403);
    }

    const [existingMember] = await sql`
      SELECT id FROM team_members WHERE team_id = ${invite.team_id} AND user_id = ${user.id}
    `;

    if (existingMember) {
      await sql`DELETE FROM team_invites WHERE id = ${invite.id}`;
      return c.json({ error: 'You are already a member of this team' }, 400);
    }

    await sql`
      INSERT INTO team_members (team_id, user_id, role, invited_by)
      VALUES (${invite.team_id}, ${user.id}, ${invite.role}, ${invite.invited_by})
    `;

    await sql`DELETE FROM team_invites WHERE id = ${invite.id}`;

    const [team] = await sql`SELECT * FROM teams WHERE id = ${invite.team_id}`;

    return c.json({ message: 'Joined team successfully', team });
  } catch (error) {
    console.error('Error joining team:', error);
    return c.json({ error: 'Failed to join team' }, 500);
  }
});

teamRoutes.delete('/:id/members/:userId', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const teamId = c.req.param('id');
  const targetUserId = c.req.param('userId');

  try {
    const [membership] = await sql`
      SELECT role FROM team_members WHERE team_id = ${teamId} AND user_id = ${user.id}
    `;

    const isSelf = targetUserId === user.id;
    const isAdminOrOwner = membership && ['owner', 'admin'].includes(membership.role);

    if (!isSelf && !isAdminOrOwner) {
      return c.json({ error: 'Permission denied' }, 403);
    }

    const [targetMember] = await sql`
      SELECT role FROM team_members WHERE team_id = ${teamId} AND user_id = ${targetUserId}
    `;

    if (!targetMember) {
      return c.json({ error: 'Member not found' }, 404);
    }

    if (targetMember.role === 'owner') {
      return c.json({ error: 'Cannot remove the team owner' }, 400);
    }

    await sql`
      DELETE FROM team_members WHERE team_id = ${teamId} AND user_id = ${targetUserId}
    `;

    return c.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    return c.json({ error: 'Failed to remove member' }, 500);
  }
});

teamRoutes.get('/:id/conversations', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const teamId = c.req.param('id');

  try {
    const [membership] = await sql`
      SELECT role FROM team_members WHERE team_id = ${teamId} AND user_id = ${user.id}
    `;

    if (!membership) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const conversations = await sql`
      SELECT c.*, u.name as owner_name, u.picture as owner_picture
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      WHERE c.team_id = ${teamId}
      ORDER BY c.updated_at DESC
    `;

    return c.json({ conversations });
  } catch (error) {
    console.error('Error fetching team conversations:', error);
    return c.json({ error: 'Failed to fetch conversations' }, 500);
  }
});

teamRoutes.post('/:id/conversations/:conversationId', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const teamId = c.req.param('id');
  const conversationId = c.req.param('conversationId');

  try {
    const [membership] = await sql`
      SELECT role FROM team_members WHERE team_id = ${teamId} AND user_id = ${user.id}
    `;

    if (!membership) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const [conversation] = await sql`
      SELECT * FROM conversations WHERE id = ${conversationId} AND user_id = ${user.id}
    `;

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    await sql`
      UPDATE conversations SET team_id = ${teamId}, updated_at = NOW()
      WHERE id = ${conversationId}
    `;

    return c.json({ message: 'Conversation shared with team' });
  } catch (error) {
    console.error('Error sharing conversation:', error);
    return c.json({ error: 'Failed to share conversation' }, 500);
  }
});

teamRoutes.delete('/:id/conversations/:conversationId', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401);

  const user = await auth.validateSession(sessionToken);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const teamId = c.req.param('id');
  const conversationId = c.req.param('conversationId');

  try {
    const [conversation] = await sql`
      SELECT * FROM conversations WHERE id = ${conversationId} AND team_id = ${teamId}
    `;

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    if (conversation.user_id !== user.id) {
      const [membership] = await sql`
        SELECT role FROM team_members WHERE team_id = ${teamId} AND user_id = ${user.id}
      `;
      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return c.json({ error: 'Permission denied' }, 403);
      }
    }

    await sql`
      UPDATE conversations SET team_id = NULL, updated_at = NOW()
      WHERE id = ${conversationId}
    `;

    return c.json({ message: 'Conversation removed from team' });
  } catch (error) {
    console.error('Error removing conversation:', error);
    return c.json({ error: 'Failed to remove conversation' }, 500);
  }
});

export default teamRoutes;
