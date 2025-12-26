import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'files'
      ) THEN
        ALTER TABLE messages ADD COLUMN files JSONB;
      END IF;
    END $$
  `;
  console.log('✓ messages.files column ready');
}

export async function down(sql: Sql) {
  await sql`ALTER TABLE messages DROP COLUMN IF EXISTS files`;
}
