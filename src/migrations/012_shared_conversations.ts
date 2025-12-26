import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'share_id'
      ) THEN
        ALTER TABLE conversations ADD COLUMN share_id VARCHAR(12) UNIQUE;
      END IF;
    END $$
  `;
  console.log('✓ conversations.share_id column ready');

  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'is_shared'
      ) THEN
        ALTER TABLE conversations ADD COLUMN is_shared BOOLEAN DEFAULT FALSE;
      END IF;
    END $$
  `;
  console.log('✓ conversations.is_shared column ready');

  await sql`CREATE INDEX IF NOT EXISTS idx_conversations_share_id ON conversations(share_id) WHERE share_id IS NOT NULL`;
  console.log('✓ conversations share_id index ready');
}

export async function down(sql: Sql) {
  await sql`DROP INDEX IF EXISTS idx_conversations_share_id`;
  await sql`ALTER TABLE conversations DROP COLUMN IF EXISTS is_shared`;
  await sql`ALTER TABLE conversations DROP COLUMN IF EXISTS share_id`;
}
