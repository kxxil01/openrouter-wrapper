import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS folders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) DEFAULT '#6b7280',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✓ folders table ready');

  await sql`CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id)`;
  console.log('✓ folders user_id index ready');

  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'folder_id'
      ) THEN
        ALTER TABLE conversations ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
      END IF;
    END $$
  `;
  console.log('✓ conversations.folder_id column ready');

  await sql`CREATE INDEX IF NOT EXISTS idx_conversations_folder_id ON conversations(folder_id)`;
  console.log('✓ conversations folder_id index ready');
}

export async function down(sql: Sql) {
  await sql`ALTER TABLE conversations DROP COLUMN IF EXISTS folder_id`;
  await sql`DROP TABLE IF EXISTS folders CASCADE`;
}
