import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'system_prompt'
      ) THEN
        ALTER TABLE conversations ADD COLUMN system_prompt TEXT;
      END IF;
    END $$
  `;
  console.log('✓ conversations.system_prompt column ready');
}

export async function down(sql: Sql) {
  await sql`ALTER TABLE conversations DROP COLUMN IF EXISTS system_prompt`;
}
