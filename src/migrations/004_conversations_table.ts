import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'user_id'
      ) THEN
        ALTER TABLE conversations ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
      END IF;
    END $$
  `;
  console.log('✓ conversations.user_id column ready');

  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
      model_id VARCHAR(100) NOT NULL DEFAULT 'deepseek/deepseek-r1-0528:free',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✓ conversations table ready');

  await sql`CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`;
  console.log('✓ conversations user_id index ready');

  await sql`CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)`;
  console.log('✓ conversations updated_at index ready');

  await sql`CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC)`;
  console.log('✓ conversations created_at index ready');

  await sql`CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)`;
  console.log('✓ conversations user+updated_at composite index ready');
}

export async function down(sql: Sql) {
  await sql`DROP TABLE IF EXISTS conversations CASCADE`;
}
