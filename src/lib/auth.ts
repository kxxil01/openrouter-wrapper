import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: { rejectUnauthorized: false },
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/callback';
const SESSION_EXPIRY_DAYS = 7;

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  locale?: string;
  hd?: string;
}

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture: string;
  locale?: string;
  hd?: string;
  subscription_status: 'free' | 'active' | 'cancelled' | 'expired';
  subscription_expires_at?: Date;
  message_count: number;
  message_count_reset_at: Date;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  openrouter_api_key?: string;
  total_tokens_used?: number;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<{ access_token: string; id_token: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUser> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

export async function findOrCreateUser(googleUser: GoogleUser): Promise<User> {
  const [existingUser] = await sql<User[]>`
    SELECT * FROM users WHERE google_id = ${googleUser.id}
  `;

  if (existingUser) {
    const [updated] = await sql<User[]>`
      UPDATE users SET
        name = ${googleUser.name},
        picture = ${googleUser.picture},
        locale = ${googleUser.locale || null},
        last_login_at = NOW()
      WHERE google_id = ${googleUser.id}
      RETURNING *
    `;
    return updated;
  }

  const [newUser] = await sql<User[]>`
    INSERT INTO users (google_id, email, name, picture, locale, hd, last_login_at)
    VALUES (${googleUser.id}, ${googleUser.email}, ${googleUser.name}, ${googleUser.picture}, ${googleUser.locale || null}, ${googleUser.hd || null}, NOW())
    RETURNING *
  `;
  return newUser;
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
    VALUES (${userId}, ${tokenHash}, ${expiresAt}, ${ipAddress || null}, ${userAgent || null})
  `;

  return token;
}

export async function validateSession(token: string): Promise<User | null> {
  const tokenHash = await hashToken(token);

  const result = await sql`
    SELECT 
      u.id, u.google_id, u.email, u.name, u.picture, u.locale, u.hd, 
      u.subscription_status, u.subscription_expires_at, u.message_count, u.message_count_reset_at,
      u.created_at, u.updated_at, u.last_login_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW()
  `;

  if (!result.length) {
    return null;
  }

  const row = result[0];
  return {
    id: row.id,
    google_id: row.google_id,
    email: row.email,
    name: row.name,
    picture: row.picture,
    locale: row.locale,
    hd: row.hd,
    subscription_status: row.subscription_status || 'free',
    subscription_expires_at: row.subscription_expires_at,
    message_count: row.message_count || 0,
    message_count_reset_at: row.message_count_reset_at || new Date(),
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_login_at,
  };
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = await hashToken(token);
  await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
}

export async function deleteExpiredSessions(): Promise<void> {
  await sql`DELETE FROM sessions WHERE expires_at < NOW()`;
}

export async function getUserById(userId: string): Promise<User | null> {
  const [user] = await sql<User[]>`SELECT * FROM users WHERE id = ${userId}`;
  return user || null;
}
