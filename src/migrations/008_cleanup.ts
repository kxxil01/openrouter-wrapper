import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    DELETE FROM messages WHERE conversation_id IN (
      SELECT id FROM conversations WHERE user_id IS NULL
    )
  `;
  const deletedConversations = await sql`
    DELETE FROM conversations WHERE user_id IS NULL
  `;
  console.log(`✓ cleaned up ${deletedConversations.count} legacy conversations without user_id`);

  await sql`ANALYZE users, sessions, conversations, messages, user_preferences`;
  console.log('✓ tables analyzed');
}

export async function down(_sql: Sql) {
  // No rollback for cleanup
}
