import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    CREATE INDEX IF NOT EXISTS idx_messages_content_search 
    ON messages USING gin(to_tsvector('english', content))
  `;
  console.log('✓ messages full-text search index ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_conversations_title_search 
    ON conversations USING gin(to_tsvector('english', title))
  `;
  console.log('✓ conversations title search index ready');
}

export async function down(sql: Sql) {
  await sql`DROP INDEX IF EXISTS idx_messages_content_search`;
  await sql`DROP INDEX IF EXISTS idx_conversations_title_search`;
}
