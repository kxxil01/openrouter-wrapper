import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
      default_model_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `;
  console.log('✓ user_preferences table ready');

  await sql`DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences`;
  await sql`
    CREATE TRIGGER update_user_preferences_updated_at
      BEFORE UPDATE ON user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
  `;
  console.log('✓ user_preferences updated_at trigger ready');
}

export async function down(sql: Sql) {
  await sql`DROP TABLE IF EXISTS user_preferences CASCADE`;
}
