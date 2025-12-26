import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'images'
      ) THEN
        ALTER TABLE messages ADD COLUMN images JSONB;
      END IF;
    END $$
  `;
  console.log('✓ messages.images column ready');
}

export async function down(sql: Sql) {
  await sql`ALTER TABLE messages DROP COLUMN IF EXISTS images`;
}
