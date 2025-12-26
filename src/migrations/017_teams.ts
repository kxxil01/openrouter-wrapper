import { sql } from '../lib/db';

export async function up(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS teams (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log('✓ teams table ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id)
  `;
  console.log('✓ teams owner_id index ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug)
  `;
  console.log('✓ teams slug index ready');

  await sql`
    CREATE TABLE IF NOT EXISTS team_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
      invited_by UUID REFERENCES users(id),
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, user_id)
    )
  `;
  console.log('✓ team_members table ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)
  `;
  console.log('✓ team_members team_id index ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)
  `;
  console.log('✓ team_members user_id index ready');

  await sql`
    CREATE TABLE IF NOT EXISTS team_invites (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
      token VARCHAR(255) NOT NULL UNIQUE,
      invited_by UUID NOT NULL REFERENCES users(id),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, email)
    )
  `;
  console.log('✓ team_invites table ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token)
  `;
  console.log('✓ team_invites token index ready');

  await sql`
    ALTER TABLE conversations 
    ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL
  `;
  console.log('✓ conversations.team_id column ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_conversations_team_id ON conversations(team_id)
  `;
  console.log('✓ conversations team_id index ready');
}

export async function down(): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_conversations_team_id`;
  await sql`ALTER TABLE conversations DROP COLUMN IF EXISTS team_id`;
  await sql`DROP TABLE IF EXISTS team_invites`;
  await sql`DROP TABLE IF EXISTS team_members`;
  await sql`DROP TABLE IF EXISTS teams`;
  console.log('✓ teams tables dropped');
}
